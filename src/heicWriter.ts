/*
 * This file is part of @aidin36/xmp Javascript package.
 *
 * @aidin36/xmp is free software: you can redistribute it and/or modify it under
 * the terms of the GNU Lesser General Public License as published by the Free
 * Software Foundation, either version 3 of the License, or (at your option) any
 *  later version.
 *
 * @aidin36/xmp is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more details
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with @aidin26/xmp. If not, see <https://www.gnu.org/licenses/>.
 */

import { Box, MetaBox, findBox, findMetaBox, findXmpMetadataID, IlocBox, parseIlocBox } from './heicReader'
import {
  uint16ToBytes,
  uint32ToBytes,
  uint64ToBytes,
  bytes2Uint16,
  bytes2Uint32,
  concatArrays,
  cloneUint8Array,
} from './utils'

// "mime" and "infe" strings in the form of bytes
const MIME = [109, 105, 109, 101]
const IINF = [105, 105, 110, 102]
const INFE = [105, 110, 102, 101]
const ILOC = [105, 108, 111, 99]
const APPLICATION_XML = [97, 112, 112, 108, 105, 99, 97, 116, 105, 111, 110, 47, 114, 100, 102, 43, 120, 109, 108]

/**
 * Goes through all the items in the iloc, and update their offsets.
 * Note that it modifies the image parameter. To save the memory.
 *
 * @param affectedOffset Will update ilocs that point to a location after this
 *   offset.
 * @param addedSize adds this number to the offsets. It can be negative.
 */
const correctAllIlocItems = (image: Uint8Array, metaBox: MetaBox, affectedOffset: number, addedSize: number) => {
  if (addedSize === 0) {
    return image
  }

  const iloc = parseIlocBox(metaBox.metaInnerBoxesData)

  if (!iloc) {
    throw Error(`correctAllIlocItems: Expected to find an iloc Box.`)
  }
  if (iloc.offsetSize !== 4 && iloc.offsetSize !== 8) {
    throw Error(`Invalid image format. Iloc's Offset Size must be 4 or 8, but was ${iloc.offsetSize}`)
  }

  iloc.ilocItems.forEach((item) => {
    item.extends.forEach((extend) => {
      // This is kinda dirty! When we're parsing iloc Box, we pass 'metaInnerBoxesData' to the method.
      // So all the indexes are relative to that.
      // The 'metaInnerBoxesData' start from 'metaBox.dataStartIndex + 4'.
      // Then, we have 'iloc.dataStartIndex' which is relative to the 'metaInnerBoxesData', and
      // offsetFieldRelativeIndex' is relative to the start of the iloc's data.
      // That's how find the index for the 'offset'!
      const offsetStartIndex = metaBox.dataStartIndex + 4 + iloc.dataStartIndex + extend.offsetFieldRelativeIndex
      if (extend.offset === affectedOffset) {
        // The length of the data this one points to changed, but not its location.
        // i.e. it's the item that points to XMP data, and we updated the XMP.
        const lengthStartIndex = offsetStartIndex + iloc.offsetSize
        const newLength = extend.length + addedSize
        if (iloc.lengthSize === 4) {
          image.set(uint32ToBytes(newLength), lengthStartIndex)
        } else {
          image.set(uint64ToBytes(newLength), lengthStartIndex)
        }
      }
      if (extend.offset > affectedOffset) {
        const newOffset = extend.offset + addedSize
        if (iloc.offsetSize === 4) {
          // Did it this way to save memory. Otherwise had to create a few
          // copies of the potentially large image array.
          image.set(uint32ToBytes(newOffset), offsetStartIndex)
        } else {
          image.set(uint64ToBytes(newOffset), offsetStartIndex)
        }
      }
    })
  })

  return image
}

/**
 *
 * @param version - Version that defined by the parent iloc Box
 * @param baseOffsetSize - Defined by the parent iloc Box
 * @param offsetSize - Defined by the parent iloc Box
 * @param lengthSize - Defined by the parent iloc Box
 * @param indexSize - Defined by the parent iloc Box
 * // TODO: Is this statement correct? We didn't use this index here.
 * @param index - In version 1 & 2 the items are sorted by index. Pass the index
 *    this item should have.
 */
const createIlocItem = (
  version: number,
  baseOffsetSize: number,
  offsetSize: number,
  lengthSize: number,
  indexSize: number,
  index: number,
  metadataId: number,
  dataOffset: number,
  dataLength: number
) => {
  const itemId = version === 2 ? uint32ToBytes(metadataId) : uint16ToBytes(metadataId)

  // We currently not using the construction method.
  const constructionMethod = version === 1 || version === 2 ? [0, 0] : []

  // BaseOffsetSize can be zero
  let baseOffset: number[] = []
  if (baseOffsetSize === 4) {
    baseOffset = [0, 0, 0, 0]
  }
  if (baseOffsetSize === 8) {
    baseOffset = [0, 0, 0, 0, 0, 0, 0, 0]
  }

  // 2 or 4 bytes Metadata ID (Item ID)
  // 2 bytes construction method.
  // 2 bytes Data Reference Index - Because we're storing XMP in the same file, it's zero.
  // 4 or 8 bytes Item Base Offset that we're not using.
  // 2 bytes Extent Count - we have one.
  const item = [...itemId, ...constructionMethod, 0, 0, ...baseOffset, 0, 1]

  let extendIndex: number[] | Array<never> = []
  if ((version === 1 || version === 2) && indexSize > 0) {
    if (indexSize === 4) {
      extendIndex = [0, 0, 0, 0]
    } else {
      extendIndex = [0, 0, 0, 0, 0, 0, 0, 0]
    }
  }

  let offset: Uint8Array | undefined
  if (offsetSize === 4) {
    offset = uint32ToBytes(dataOffset)
  }
  if (offsetSize === 8) {
    offset = uint64ToBytes(dataOffset)
  }
  if (offset === undefined) {
    throw Error(`iloc offset size must be 4 or 8, but it was ${offsetSize}`)
  }

  let length: Uint8Array | undefined
  if (lengthSize === 4) {
    length = uint32ToBytes(dataLength)
  }
  if (lengthSize === 8) {
    length = uint64ToBytes(dataLength)
  }
  if (length === undefined) {
    throw Error(`iloc length size must be 4 or 8 but was ${lengthSize}`)
  }

  const extend = [...extendIndex, ...offset, ...length]

  return [...item, ...extend]
}

/**
 * @returns { ilocBox: the new Box, addedSize: Bytes that is added to the image }
 */
const createIlocBox = (metadataId: number, dataOffset: number, dataLength: number) => {
  // See the 'findXMPItemInIloc' method in the heicReader.ts for the structure.

  // one byte version
  // 3 bytes flags (I don't know if I need to put anything in the flags?)
  // 2 bytes values4 (Honestly, I copied it from another file! Don't know how to generate them.)
  //   values4 are: offsetSize=4 lengthSize=4 baseOffsetSize=4 indexSize=0
  // 2 bytes items count
  const header = [0, 0, 0, 0, 68, 64, 0, 1]

  const item = createIlocItem(0, 4, 4, 4, 0, 0, metadataId, dataOffset, dataLength)

  const boxData = [...header, ...item]

  // 4 bytes size (+8 : 4 bytes size + 4 bytes ILOC)
  // 4 bytes Box type
  const boxHeader = [...uint32ToBytes(boxData.length + 8), ...ILOC]

  const ilocBox = new Uint8Array([...boxHeader, ...boxData])

  return { ilocBox, addedSize: ilocBox.length }
}

/**
 * @returns { ilocBox: the modified Box, addedSize: Bytes that is added to the image }
 */
const appendNewIlocItem = (iloc: IlocBox, metadataId: number, dataOffset: number, dataLength: number) => {
  // Appens the new item to the end of the ILOC Box, and updates the
  // Box's size.

  // In version 1 & 2 items are sorted by an index.
  const newItemIndex =
    (iloc.version === 1 || iloc.version === 2) && iloc.indexSize > 0
      ? Math.max(...iloc.ilocItems.map((_) => _.itemId)) + 1
      : 0

  const newItem = createIlocItem(
    iloc.version,
    iloc.baseOffsetSize,
    iloc.offsetSize,
    iloc.lengthSize,
    iloc.indexSize,
    newItemIndex,
    metadataId,
    dataOffset,
    dataLength
  )

  const modifiedData = cloneUint8Array(iloc.data)

  const newSize = uint32ToBytes(iloc.size + newItem.length)
  // FIXME: We need to check if the item count exceeds the uint16
  const newItemCount =
    iloc.version === 2 ? uint32ToBytes(iloc.ilocItems.length + 1) : uint16ToBytes(iloc.ilocItems.length + 1)

  // Setting the new item count
  modifiedData.set(newItemCount, 6)

  const boxHeader = concatArrays(newSize, new Uint8Array(ILOC))

  return { ilocBox: concatArrays(boxHeader, modifiedData, new Uint8Array(newItem)), addedSize: newItem.length }
}

const createInfeBox = (metadataId: number) => {
  // 4 bytes size
  // 4 bytes Box type ("infe")
  // 1 byte version (version 2 and 3 only differ in Item ID sizes. We use 3 just to stay safe.)
  // 3 bytes flags that we don't use.
  // 4 bytes Item ID
  // 2 bytes protection index (zero means unprotected. I don't know what is a protect item honestly!)
  // 4 bytes type ("mime") then a null
  // Then the item name
  const boxData = [...INFE, 3, 0, 0, 0, ...uint32ToBytes(metadataId), 0, 0, ...MIME, 0, ...APPLICATION_XML]
  // +4 cause the 4 bytes 'size' is also included in the 'size' field.
  return [...uint32ToBytes(boxData.length + 4), ...boxData]
}

/**
 * Creates IINF (with an INFE inside) and ILOC Boxes.
 */
const createNewIinfBox = (image: Uint8Array, metaBox: Box) => {
  // See the 'findXmpMetadataID' method for the structure of the IINF Box.

  // one byte version
  // 3 bytes flags (I don't know if I need to put anything in the flags?)
  // 4 bytes "entry counts" (count of INFE Boxes) - which is one here.
  const iinfHeader = [2, 0, 0, 0, 0, 0, 0, 1]

  // Because it the first and only INFE, we start from 1
  const metadataId = 1
  const infeBox = createInfeBox(metadataId)

  // + 4 bytes size and 4 bytes "iinf"
  const iinfBoxSize = iinfHeader.length + infeBox.length + 8
  const iinfBoxHeader = [...uint16ToBytes(iinfBoxSize), ...IINF]

  const iinfBox = new Uint8Array([...iinfBoxHeader, ...iinfHeader, ...infeBox])

  // The size of the Meta Box will increase. We're setting the new size.
  const newMetaBoxSize = uint32ToBytes(metaBox.size + iinfBox.length)

  // There was no iinf Box, so there shouldn't be any iloc Boxes either. So we
  // don't need to correct any iloc Boxes.
  // TODO: Validate the above by reading the standard.

  // The first four bytes of each Box is its size.
  return concatArrays(
    image.subarray(0, metaBox.boxStartIndex),
    newMetaBoxSize,
    image.subarray(metaBox.boxStartIndex + 4, metaBox.boxEndIndex),
    iinfBox,
    image.subarray(metaBox.boxEndIndex)
  )
}

const findNextInfeItemId = (iinfBox: Box) => {
  // Same algorithm as findXmpMetadataID
  const iinfVersion = iinfBox.data[0]
  const dataOffset = iinfVersion === 0 ? 2 : 4
  let curIndex = 4 + dataOffset

  let maxItemId = 1

  let infeBox = findBox(iinfBox.data, 'infe', curIndex)
  while (infeBox != null) {
    const infeVersion = infeBox.data[0]

    const itemId =
      infeVersion <= 2 ? bytes2Uint16(infeBox.data.subarray(4, 6)) : bytes2Uint32(infeBox.data.subarray(4, 8))

    if (itemId > maxItemId) {
      maxItemId = itemId
    }

    // Continue checking other infe Boxes
    curIndex += infeBox.size
    infeBox = findBox(iinfBox.data, 'infe', curIndex)
  }

  return maxItemId + 1
}

const addInfeBox = (image: Uint8Array, metaBox: Box, iinfBox: Box) => {
  // What it does:
  // Finds the next free INFE Item ID
  // Creates the INFE Box
  // Appends it to the IINF Box
  // Updates IINF Box's size

  const metadataId = findNextInfeItemId(iinfBox)

  // TODO: FIXME: We need to increase the entry count in the IINF Box.
  const infeBox = createInfeBox(metadataId)

  const newIinfSize = iinfBox.size + infeBox.length
  const newMetaSize = metaBox.size + infeBox.length

  // When we're searching for IINF Box, we send 'metaBox.metaInnerBoxesData' to
  // the 'findBox' method. So, the indexes it returns are relative to the start
  // of the 'metaInnerBoxesData'. Which is 'metaBox.dataStartIndex + 4'.
  // It's very error prone to keep the indexes like this. I actually made a
  // mistake here that took me a while to debug! Need to clean this up.
  const absoluteIinfStartIndex = metaBox.dataStartIndex + 4 + iinfBox.boxStartIndex
  const absoluteIinfEndIndex = metaBox.dataStartIndex + 4 + iinfBox.boxEndIndex

  // We replace the 'size' of the IINF and Meta Boxes, and append our new
  // INFE Box to the end of the IINF Box.
  const modifiedImage = new Uint8Array([
    ...image.subarray(0, metaBox.boxStartIndex),
    ...uint32ToBytes(newMetaSize),
    ...image.subarray(metaBox.boxStartIndex + 4, absoluteIinfStartIndex),
    ...uint32ToBytes(newIinfSize),
    ...image.subarray(absoluteIinfStartIndex + 4, absoluteIinfEndIndex),
    ...infeBox,
    ...image.subarray(absoluteIinfEndIndex),
  ])

  const newMetaBox = findMetaBox(modifiedImage)
  if (newMetaBox == null) {
    throw Error(`MetaBox corrupted after we modified it. Please report this bug!`)
  }
  const correctedImage = correctAllIlocItems(modifiedImage, newMetaBox, metaBox.boxStartIndex, infeBox.length)

  return { modifiedImage: correctedImage, newMetadataId: metadataId, newMetaBox }
}

/**
 * Append the XMP data to the image.
 */
const addNewXmpData = (image: Uint8Array, xmp: Uint8Array, metaBox: MetaBox, metadataId: number) => {
  const iloc = parseIlocBox(metaBox.metaInnerBoxesData)

  // We're going to add the XMP to the end of the file, so the offset is the
  // end of the file.
  const { ilocBox, addedSize } =
    iloc == null
      ? createIlocBox(metadataId, image.length, xmp.length)
      : appendNewIlocItem(iloc, metadataId, image.length, xmp.length)

  // TODO: I should reduce the number of cloning to save the memory. I can clone
  // once and modify the parameter in other functions.

  const newMetaBoxSize = metaBox.size + addedSize
  // metaBox.data is after the Header. Here we want to modify the header itself.
  let modifiedMetaBox = image.subarray(metaBox.boxStartIndex, metaBox.boxEndIndex)
  modifiedMetaBox.set(uint32ToBytes(newMetaBoxSize), 0)

  if (iloc == null) {
    modifiedMetaBox = concatArrays(modifiedMetaBox, ilocBox)
  } else {
    // Replace the existing iloc Box
    // XXX: The indexes of iloc Box are relative to the beginning of
    // 'metaInnerBoxesData', which is after 4 bytes size + 4 bytes 'meta' +
    // 4 bytes flags. I made a mistake a few times to think that these indexes
    // are relative to the beginning of the meta Box. Need to find a better way!
    modifiedMetaBox = concatArrays(
      modifiedMetaBox.subarray(0, iloc.boxStartIndex + 8 + 4),
      ilocBox,
      modifiedMetaBox.subarray(iloc.boxEndIndex + 8 + 4)
    )
  }

  // Replacing the meta Box, and at the same time appending the XMP
  // data to the end of the image.
  const concatedImage = concatArrays(
    image.subarray(0, metaBox.boxStartIndex),
    modifiedMetaBox,
    image.subarray(metaBox.boxEndIndex),
    xmp
  )

  const newMetaBox = findMetaBox(concatedImage)
  if (newMetaBox == null) {
    throw Error(`MetaBox corrupted after we modified it. Please report this bug!`)
  }
  const correctedImage = correctAllIlocItems(concatedImage, newMetaBox, metaBox.boxStartIndex, addedSize)

  return correctedImage
}

const replaceExistingXmpData = (image: Uint8Array, metaBox: MetaBox, metadataId: number, newXmp: Uint8Array) => {
  const iloc = parseIlocBox(metaBox.metaInnerBoxesData)

  if (iloc == null) {
    throw Error(
      `This is a bug! The image should already have an iloc Box, but I didn't find it. meta Box = ${JSON.stringify(metaBox)}`
    )
  }

  const xmpItem = iloc.ilocItems.find((itm) => itm.itemId === metadataId)

  if (xmpItem == null) {
    throw Error(
      `This is a bug! The image should have an iloc with the ${metadataId} ID, but I didn't find it. meta Box=${JSON.stringify(metaBox)}`
    )
  }

  if (xmpItem.dataReferenceIndex !== 0) {
    throw Error('The XMP data is not stored in the current file. This is not supported yet.')
  }

  // TODO: Maybe we can delete all the extends and then create a single one?
  if (xmpItem.extentCount !== 1) {
    throw Error(
      `Sorry, this image is not supported yet. The iloc item that points to the XMP data has multiple extends. item = ${JSON.stringify(xmpItem)}`
    )
  }

  const extend = xmpItem.extends.at(0)!
  const oldXmp = image.subarray(extend.offset, extend.offset + extend.length)

  const modifiedImage = concatArrays(
    image.subarray(0, extend.offset),
    newXmp,
    image.subarray(extend.offset + extend.length)
  )

  const sizeDiff = newXmp.length - oldXmp.length

  // It also corrects the length of the iloc item that stored our XMP data.
  return correctAllIlocItems(modifiedImage, metaBox, extend.offset, sizeDiff)
}

/**
 * @internal
 */
export const heicWriteOrUpdateXmp = (image: Uint8Array, xmp: Uint8Array): Uint8Array => {
  const metaBox = findMetaBox(image)

  if (metaBox == null) {
    throw Error(
      'There is no Meta Box inside this file. Currently, creating a new Meta Box from scratch is not supported'
    )
  }

  // There are multiple Boxes inside the 'meta' Box. We're searching within the
  // Meta Box for our 'iinf' Box.
  const iinfBox = findBox(metaBox.metaInnerBoxesData, 'iinf')

  if (iinfBox == null) {
    // TODO: continue: I add the new iloc box in both methods.
    const modifiedImage = createNewIinfBox(image, metaBox)
    const newMetaBox = findMetaBox(modifiedImage)
    if (newMetaBox == null) {
      throw Error(`MetaBox corrupted after we modified it. Please report this bug!`)
    }
    // We created a new IINF box, so the Metadata ID starts from one.
    return addNewXmpData(modifiedImage, xmp, newMetaBox, 1)
  }

  // Now, we find the Metadata ID (from an INFE Box inside the IINF Box)
  const metadataId = findXmpMetadataID(iinfBox.data)

  if (metadataId == null) {
    const { modifiedImage, newMetadataId, newMetaBox } = addInfeBox(image, metaBox, iinfBox)
    return addNewXmpData(modifiedImage, xmp, newMetaBox, newMetadataId)
  }

  return replaceExistingXmpData(image, metaBox, metadataId, xmp)
}
