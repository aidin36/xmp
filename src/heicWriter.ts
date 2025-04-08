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

import { Box, findBox, findMetaBox, findXmpMetadataID, IlocItem, parseIlocBox } from './heicReader'
import { uint16ToBytes, uint32ToBytes, bytes2Uint16, bytes2Uint32, concatArrays, cloneUint8Array } from './utils'

// "mime" and "infe" strings in the form of bytes
const MIME = [109, 105, 109, 101]
const IINF = [105, 105, 110, 101]
const INFE = [105, 110, 102, 101]
const ILOC = [105, 108, 111, 99]
const APPLICATION_XML = [97, 112, 112, 108, 105, 99, 97, 116, 105, 111, 110, 47, 114, 100, 102, 43, 120, 109, 108]

const createIlocItem = (metadataId: number, dataOffset: number, dataLength: number) => {
  // 2 bytes Metadata ID (Item ID)
  // 2 bytes Data Reference Index - Because we're storing XMP in the same file, it's zero.
  // 4 bytes Item Base Offset that we're not using.
  // 2 bytes Extent Count - we have one.
  const item = [...uint16ToBytes(metadataId), 0, 0, 0, 0, 0, 0, 0, 1]

  const extend = [...uint32ToBytes(dataOffset), ...uint32ToBytes(dataLength)]

  return [...item, ...extend]
}

/**
 * @returns { ilocBox: the new Box, addedSize: Bytes that is added to the image }
 */
const createIlocBox = (metadataId: number, dataOffset: number, dataLength: number) => {
  // See the 'findXMPItemInIloc' method in the heicReader.ts for the structure.

  // 4 bytes size (I count it manually!)
  // 4 bytes Box type
  const boxHeader = [0, 0, 0, 34, ...ILOC]

  // one byte version
  // 3 bytes flags (I don't know if I need to put anything in the flags?)
  // 2 bytes values4 (Honestly, I copied it from another file! Don't know how to generate them.)
  //   values4 are: offsetSize=4 lengthSize=4 baseOffsetSize=4 indexSize=0
  // 2 bytes items count
  const header = [0, 0, 0, 0, 68, 64, 0, 1]

  const item = createIlocItem(metadataId, dataOffset, dataLength)

  const ilocBox = new Uint8Array([...boxHeader, ...header, ...item])
  return { ilocBox, addedSize: ilocBox.length }
}

/**
 * @returns { ilocBox: the modified Box, addedSize: Bytes that is added to the image }
 */
const appendNewIlocItem = (
  iloc: { ilocBox: Box; ilocItems: IlocItem[] },
  metadataId: number,
  dataOffset: number,
  dataLength: number
) => {
  // Appens the new item to the end of the ILOC Box, and updates the
  // Box's size.

  const newItem = createIlocItem(metadataId, dataOffset, dataLength)

  const modifiedIlocBox = cloneUint8Array(iloc.ilocBox.data)

  // Replacing the first four bytes (size)
  const newSize = uint32ToBytes(iloc.ilocBox.size + newItem.length)
  modifiedIlocBox.set(newSize, 0)

  return { ilocBox: concatArrays(modifiedIlocBox, new Uint8Array(newItem)), addedSize: newItem.length }
}

const createInfeBox = (metadataId: number) =>
  // Our fist and only INFE item.
  // 4 bytes size
  // 4 bytes Box type ("infe")
  // 4 bytes Item ID
  // 4 bytes type ("mime") then a null
  [0, 0, 0, 12, ...INFE, ...uint32ToBytes(metadataId), ...MIME, 0, ...APPLICATION_XML]

/**
 * Creates IINF (with an INFE inside) and ILOC Boxes.
 */
const createNewIinfBox = (image: Uint8Array, metaBox: Box, xmpLength: number) => {
  // See the 'findXmpMetadataID' method for the structure of the IINF Box.

  // one byte version
  // 3 bytes flags (I don't know if I need to put anything in the flags?)
  // 4 bytes "entry counts" (count of INFE Boxes) - which is one here.
  const iinfHeader = [2, 0, 0, 0, 0, 0, 0, 1]

  // Because it the first and only INFE, we start from 1
  const infeBox = createInfeBox(1)

  // + 4 bytes size and 4 bytes "iinf"
  const iinfBoxSize = iinfHeader.length + infeBox.length + 8
  const iinfBoxHeader = [...uint16ToBytes(iinfBoxSize), ...IINF]

  const iinfBox = new Uint8Array([...iinfBoxHeader, ...iinfHeader, ...infeBox])

  // There was no INFE Box, so there shouldn't be any ILOC Box either. We're creating a new one.
  // We're appending XMP to the end of the file. So the offset is the end of the file.
  const { ilocBox, addedSize: ilocBoxSize } = createIlocBox(1, image.length, xmpLength)

  // The size of the Meta Box will increase. We're setting the new size.
  const newMetaBoxSize = uint32ToBytes(metaBox.size + iinfBox.length + ilocBoxSize)

  const modifiedImage = cloneUint8Array(image)

  // The first four bytes of each Box is its size.
  modifiedImage[metaBox.boxStartIndex] = newMetaBoxSize.at(0)!
  modifiedImage[metaBox.boxStartIndex + 1] = newMetaBoxSize.at(1)!
  modifiedImage[metaBox.boxStartIndex + 2] = newMetaBoxSize.at(2)!
  modifiedImage[metaBox.boxStartIndex + 3] = newMetaBoxSize.at(3)!

  // TODO: It shifts all the data in the image. So we need to find and correct all iloc boxes :/
  return concatArrays(
    modifiedImage.subarray(0, metaBox.boxEndIndex),
    iinfBox,
    modifiedImage.subarray(metaBox.boxEndIndex),
    ilocBox
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

const addInfeBox = (image: Uint8Array, iinfBox: Box) => {
  // What it does:
  // Finds the next free INFE Item ID
  // Creates the INFE Box
  // Appends it to the IINF Box
  // Updates IINF Box's size

  const metadataId = findNextInfeItemId(iinfBox)

  const infeBox = createInfeBox(metadataId)

  const newIinfSize = iinfBox.size + infeBox.length

  // TODO: It shifts all the data in the image. So we need to find and correct all iloc boxes :/
  const modifiedImage = new Uint8Array([
    ...image.subarray(0, iinfBox.boxStartIndex),
    ...uint32ToBytes(newIinfSize),
    ...image.subarray(iinfBox.boxStartIndex + 5, iinfBox.boxStartIndex + 5 + iinfBox.size),
    ...infeBox,
    ...image.subarray(iinfBox.boxStartIndex + 5 + iinfBox.size),
  ])

  return { modifiedImage, newMetadataId: metadataId }
}

/**
 * Append the XMP data to the image.
 */
const addNewXmpData = (image: Uint8Array, xmp: Uint8Array, metaBox: Box, metadataId: number) => {
  const iloc = parseIlocBox(metaBox.data)

  const { ilocBox, addedSize } =
    iloc == null
      ? createIlocBox(metadataId, image.length, xmp.length)
      : appendNewIlocItem(iloc, metadataId, image.length, xmp.length)

  // TODO: I should reduce the number of cloning to save the memory. I can clone
  // once and modify the parameter in other functions.

  const newMetaBoxSize = metaBox.size + addedSize
  const modifiedMetaBox = concatArrays(metaBox.data, ilocBox)
  modifiedMetaBox.set(uint32ToBytes(newMetaBoxSize), 0)

  // Replacing the meta Box, and at the same time appending the XMP
  // data to the end of the image.
  return concatArrays(
    image.subarray(0, metaBox.boxStartIndex),
    modifiedMetaBox,
    image.subarray(metaBox.boxEndIndex),
    xmp
  )

  // TODO: This method or its caller need to update all iloc Boxes.
}

// TODO:
const replaceExistingXmpData = (image: Uint8Array, metadataId: number, xmp: Uint8Array) => image

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
    const modifiedImage = createNewIinfBox(image, metaBox, xmp.length)
    // We created a new IINF box, so the Metadata ID starts from one.
    return addNewXmpData(modifiedImage, xmp, metaBox, 1)
  }

  // Now, we find the Metadata ID (from an INFE Box inside the IINF Box)
  const metadataId = findXmpMetadataID(iinfBox.data)

  if (metadataId == null) {
    const { modifiedImage, newMetadataId } = addInfeBox(image, iinfBox)
    return addNewXmpData(modifiedImage, xmp, metaBox, newMetadataId)
  }

  return replaceExistingXmpData(image, metadataId, xmp)
}
