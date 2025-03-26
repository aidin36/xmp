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

/**
 * The structure of HEIC file
 * ===========================
 *
 * Well, actually, we only care about how XMP data is stored in the file. Here I
 * explain how we find the XMP data we need.
 *
 * The HEIC file is consist of "Boxes". These Boxes contains image data,
 * metadata, etc. The structure of some of the Boxes are defined in the
 * standard. But the standard lets you define any type of boxes! And there are
 * other standards that defines what are these boxes.
 *
 * The Box we care about is "meta". It contains other Boxes within itself.
 *
 * Basically, to parse the file, we read it box-by-box. Until we find our
 * "meta" box.
 *
 * The structure of each box is:
 *     4 bytes size of the box (including the size bytes themseves) +
 *     4 bytes Type of the box (e.g. 'xml ')
 * (Size can be zero, which means the box extends until the end of the file.)
 * (There can be user-defined box types, but we don't care about them here.)
 *
 * So, we read the first 4 bytes and store it in 'size'. Then we read the second
 * 4 bytes as a string. If it wasn't 'meta', we move forward by the 'size'. Now
 * we're at the beginning of the second Box. We read 4 bytes and store it in
 * 'size'. And so on.
 *
 * Inside the 'meta' box, there can be multiple type of Boxes that store
 * different types of metadata (with different standards.) There is a 'iinf' Box
 * that also contains multiple 'infe' Boxes inside it! One of them contains
 * the XMP data we're looking for.
 *
 * We're looking for an 'infe' box that has a 'mime' and its mime is
 * 'application/rdf+xml'.
 *
 * The 'infe' box doesn't contain the actual XMP data. It contains an ID. The
 * actual data is stored in a 'iloc' Box, that contains the ID we read from the
 *  'infe' box.
 * (There's an 'iref' Box with the same ID too. Currently, I don't know what
 * that is.)
 *
 * Within the 'iloc' Box, there are multiple 'items'. We need to find an 'item'
 * with the same ID. That 'item' is our XMP data.
 *
 * Reference:
 * I've learned about the basic structure of the file from this document and its
 * Python source code:
 * https://github.com/spacestation93/heif_howto
 * Reading 'libheif' code also helped:
 * https://github.com/strukturag/libheif/blob/1a131f9be0e899004233b605cd3102251986d933/libheif/context.cc#L1358
 *
 * The publicly available standard is here:
 * https://web.archive.org/web/20220208140702/https://b.goeswhere.com/ISO_IEC_14496-12_2015.pdf
 */

import { bytes2Uint32, binArray2String, bytes2Uint16, bytes2Uint64 } from './utils'

// TODO: The data might have been compressed.

// TODO: Maybe I should try to find the 'ftyp' box at the beginning of the file
//  to ensure I'm parsing a HEIC file.

// TODO: These images might be useful for testing: https://github.com/nokiatech/heif/tree/gh-pages/content/images

type Box = {
  size: number
  type: string
  dataStartIndex: number
  dataEndIndex: number
  data: Uint8Array
}

const MIME = new Uint8Array([109, 105, 109, 101])

/**
 * @internal
 * Finds the first box with the specified type.
 *
 * @param from - Where to start the search. It's for recursion. You shouldn't pass it.
 *
 * @return Box info or undefined if the box not found.
 */
const findBox = (image: Uint8Array, boxType: string, from: number = 0): Box | undefined => {
  if (from >= image.length) {
    return undefined
  }

  // TODO: size = 1 is also a special case. See: https://github.com/spacestation93/heif_howto/blob/main/box_parts.py#L182

  const subImage = image.subarray(from)
  const foundSize = bytes2Uint32(subImage)
  // When size is zero, it means the box extends until the end of the image.
  const actualSize = foundSize === 0 ? image.length - from : foundSize
  const foundType = binArray2String(subImage.subarray(4, 8))

  if (foundType === boxType) {
    const dataStartIndex = from + 8
    const dataEndIndex = from + actualSize

    return {
      size: foundSize,
      type: foundType,
      dataStartIndex,
      dataEndIndex,
      data: image.subarray(dataStartIndex, dataEndIndex),
    }
  }

  return findBox(image, boxType, from + actualSize)
}

/**
 * Finds the INFE Box within the IINF Box that contains the ID of the IREF Box
 * we need.
 *
 * @returns Item ID (Metadata ID) inside the INFE Box. Returns undefined if
 *   no such box found.
 */
const findXmpMetadataID = (iinfBox: Uint8Array): number | undefined => {
  // There are multiple infe Boxes within the iinf Box. We're looking for one
  // that has 'application/rdf+xml' meme.

  // Structure of each infe box. Copied from:
  // https://github.com/strukturag/libheif/blob/1a131f9be0e899004233b605cd3102251986d933/libheif/box.cc#L2136
  /*
   *                     version <= 1    version 2   version > 2    mime     uri
   * -----------------------------------------------------------------------------------------------
   * item id               16               16           32          16/32   16/32
   * protection index      16               16           16          16      16
   * item type             -                yes          yes         yes     yes
   * item name             yes              yes          yes         yes     yes
   * content type          yes              -            -           yes     -
   * content encoding      yes              -            -           yes     -
   * hidden item           -                yes          yes         yes     yes
   * item uri type         -                -            -           -       yes
   *
   * Note: HEIF does not allow version 0 and version 1 boxes ! (see 23008-12, 10.2.1)
   */
  // 'version' is one byte. After that are 3 bytes 'flags' just like the iinfe box.
  // We're looking for a Box with 'item type === mime' and 'item name === 'application/rfd+xml'

  // This is how libheif write these data. I read the logic of this code to
  // figure out how these Boxes are structured:
  // https://github.com/strukturag/libheif/blob/1a131f9be0e899004233b605cd3102251986d933/libheif/context.cc#L1365

  // The first byte of the iinf Box is its version.
  const iinfVersion = iinfBox[0]
  const dataOffset = iinfVersion === 0 ? 2 : 4
  // One byte 'version' and three bytes 'flags'. Depending on the 'version',
  // data starts 2 or 4 bytes after that.
  // (I don't know the logic! Saw it in other codes.)
  const startOfBoxes = 4 + dataOffset

  let curIndex = startOfBoxes

  let infeBox = findBox(iinfBox.subarray(curIndex), 'infe')
  while (infeBox != null) {
    const infeVersion = infeBox.data[0]

    // Version <=1 is not a 'mime' infe we're looking for.
    // Versions above 3 shouldn't exists in a HEIF file.
    if (infeVersion === 2 || infeVersion === 3) {
      // 3 bytes flags, then Item ID.
      const itemId =
        infeVersion === 2 ? bytes2Uint16(infeBox.data.subarray(4, 6)) : bytes2Uint32(infeBox.data.subarray(4, 8))

      const itemTypeIndex =
        infeVersion === 2
          ? // 3 bytes flags, 2 bytes 'item id' and 2 bytes 'protection index', then 'type'
            8
          : // 3 bytes flags, 4 bytes 'item id' and 2 bytes 'protection index', then 'type'
            10

      // TODO: Is there a flag or something that tells me the data is not inside the INFE box, but I should find the IREF & CDSC? Should I check the length of the box?

      // First four bytes should be 'mime'
      if (
        infeBox.data.at(itemTypeIndex) === MIME.at(0) &&
        infeBox.data.at(itemTypeIndex + 1) === MIME.at(1) &&
        infeBox.data.at(itemTypeIndex + 2) === MIME.at(2) &&
        infeBox.data.at(itemTypeIndex + 3) === MIME.at(3)
      ) {
        // After 'mime' there's a null character that we skip.
        const itemNameIndex = itemTypeIndex + 5
        if (binArray2String(infeBox.data.subarray(itemNameIndex, itemNameIndex + 19)) === 'application/rdf+xml') {
          return itemId
        }
      }
    }
    // Continue checking other infe Boxes
    curIndex += infeBox.size
    infeBox = findBox(iinfBox.subarray(curIndex), 'infe')
  }

  // No Box found that refers to XMP data.
  return undefined
}

const findXMPItemInIloc = (metadataId: number, metaBoxesData: Uint8Array) => {
  // There's only one 'iloc' Box inside the image.
  const ilocBox = findBox(metaBoxesData, 'iloc')

  if (ilocBox == null) {
    return undefined
  }

  // The algorithm is copied from here:
  // https://github.com/strukturag/libheif/blob/1a131f9be0e899004233b605cd3102251986d933/libheif/box.cc#L1347
  // Also from the standard's PDF, section 8.11.3.2

  const version = ilocBox.data[0]

  if (version > 2) {
    throw Error(`Unsupported version of 'iloc' Box: ${version}`)
  }

  // 1 byte version, 3 bytes flags, then 2 bytes 'values4'
  const values4 = bytes2Uint16(ilocBox.data.subarray(4, 6))

  /* eslint-disable no-bitwise */
  const offsetSize = (values4 >> 12) & 0xf
  const lengthSize = (values4 >> 8) & 0xf
  const baseOffsetSize = (values4 >> 4) & 0xf
  const indexSize = version === 0 ? 0 : values4 & 0xf
  /* eslint-enable no-bitwise */

  const itemCount =
    version === 2 ? bytes2Uint32(ilocBox.data.subarray(6, 10)) : bytes2Uint16(ilocBox.data.subarray(6, 8))
  const itemsBuffer = version === 2 ? ilocBox.data.subarray(10) : ilocBox.data.subarray(8)

  let curIndex = 0
  for (let itemNum = 0; itemNum < itemCount; itemNum++) {
    if (curIndex >= itemsBuffer.length) {
      throw Error(`Invalid iloc Box. Expected to find ${itemCount} items, but found less.`)
    }

    // Items have a predefined structure. So, we're reading them byte by byte based on the version.
    // TODO: Draw the structure table here, from the standard PDF.
    const itemId =
      version === 2
        ? bytes2Uint32(itemsBuffer.subarray(curIndex, curIndex + 4))
        : bytes2Uint16(itemsBuffer.subarray(curIndex, curIndex + 2))
    curIndex = version === 2 ? curIndex + 4 : curIndex + 2

    if (version === 1 || version === 2) {
      // Construction method that we're ignoring at the moment.
      // 12 bits reserved, 4 bits construction method.
      curIndex += 2
    }

    const dataReferenceIndex = bytes2Uint16(itemsBuffer.subarray(curIndex, curIndex + 2))
    curIndex += 2

    // let itemBaseOffset = 0
    // if (baseOffsetSize === 4) {
    //   itemBaseOffset = bytes2Uint32(itemsBuffer.subarray(curIndex, curIndex + 4))
    // }
    // if (baseOffsetSize === 8) {
    //   itemBaseOffset = bytes2Uint64(itemsBuffer.subarray(curIndex, curIndex + 8))
    // }
    curIndex += baseOffsetSize

    const extentCount = bytes2Uint16(itemsBuffer.subarray(curIndex, curIndex + 2))
    curIndex += 2

    const extendsList = []

    for (let extentNum = 0; extentNum < extentCount; extentNum++) {
      const extend = { index: 0, offset: 0, length: 0 }

      if ((version === 1 || version === 2) && indexSize > 0) {
        if (indexSize === 4) {
          extend.index = bytes2Uint32(itemsBuffer.subarray(curIndex, curIndex + 4))
          curIndex += 4
        }
        if (indexSize === 8) {
          extend.index = bytes2Uint64(itemsBuffer.subarray(curIndex, curIndex + 8))
          curIndex += 8
        }
      }

      if (offsetSize === 4) {
        extend.offset = bytes2Uint32(itemsBuffer.subarray(curIndex, curIndex + 4))
        curIndex += 4
      }
      if (offsetSize === 8) {
        extend.offset = bytes2Uint64(itemsBuffer.subarray(curIndex, curIndex + 8))
        curIndex += 8
      }

      if (lengthSize === 4) {
        extend.length = bytes2Uint32(itemsBuffer.subarray(curIndex, curIndex + 4))
        curIndex += 4
      }
      if (lengthSize === 8) {
        extend.length = bytes2Uint64(itemsBuffer.subarray(curIndex, curIndex + 8))
        curIndex += 8
      }

      extendsList.push(extend)
    }

    // Even when the itemId is not what we want, we have to do all above.
    // Because we don't know the length of the item, we have to parse it to
    // find the start of the next item.
    if (itemId === metadataId) {
      // We found our XMP data!
      // data-reference-index is either zero (‘this file’) or a 1‐based index into the data references in the
      // data information box
      if (dataReferenceIndex !== 0) {
        throw Error('The XMP data is not stored in the current file. This is not supported yet.')
      }

      return extendsList
    }
  }

  return undefined
}

export const heicExtractXmp = (image: Uint8Array): Uint8Array | undefined => {
  const metaBox = findBox(image, 'meta')

  if (metaBox == null) {
    return undefined
  }

  // Inside the 'meta' Box, first byte is the version, and the three bytes after
  // that are flags. (We're ignoring them for now.)
  // So Boxes start from the fifth byte.
  const metaBoxesData = image.subarray(metaBox.dataStartIndex + 4, metaBox.dataEndIndex)

  // There are multiple Boxes inside the 'meta' Box. We're using the same method
  // but we start from within the box.
  const iinfBox = findBox(metaBoxesData, 'iinf')

  if (iinfBox == null) {
    return undefined
  }

  // Now, we find the Metadata ID (from an INFE Box inside the IINF Box)
  const metadataId = findXmpMetadataID(iinfBox.data)

  if (metadataId == null) {
    return undefined
  }

  const xmpIlocExtends = findXMPItemInIloc(metadataId, metaBoxesData)

  if (xmpIlocExtends == null || xmpIlocExtends.length === 0) {
    throw Error('Metadata ID found in the file, but relevant iLoc Box could not be found.')
  }

  // XMP data can be spreaded between multiple "extends". We're merging them.
  if (xmpIlocExtends.length === 1) {
    const extend = xmpIlocExtends[0]
    return image.subarray(extend.offset, extend.offset + extend.length)
  }

  // TODO: Write a test for when XMP is inside multiple extends.

  // Note: This method is ten times faster than using spread syntax.
  const binaryArrays = xmpIlocExtends
    .sort((a, b) => a.index - b.index)
    .map((extend) => image.subarray(extend.offset, extend.offset + extend.length))

  const totalLengh = binaryArrays.reduce((acc, binArray) => acc + binArray.length, 0)
  const concatedArrays = new Uint8Array(totalLengh)

  let offset = 0
  binaryArrays.forEach((binArray) => {
    concatedArrays.set(binArray, offset)
    offset += binArray.length
  })

  return concatedArrays
}
