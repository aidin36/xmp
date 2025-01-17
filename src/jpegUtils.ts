import { numberFromBytes, binArray2String } from './utils'

const FF = 0xff
// Start Of Image (FF D8)
const SOI = 0xd8
// Start of APP segments are FF + a marker
const APP1 = 0xe1
// End Of Image (FF D9)
//const EOI = 0xd9

const isJpeg = (image: Uint8Array) => image[0] == FF && image[1] == SOI

/**
 * Finds and returns APP segments that starts with the 'marker'.
 * There can be more than one segment of each APP.
 * Returns an empty array if nothing found.
 */
const extractAppSegments = (image: Uint8Array, marker: number): Uint8Array[] => {
  // See: https://en.wikipedia.org/wiki/JPEG_File_Interchange_Format
  // https://www.w3.org/Graphics/JPEG/jfif3.pdf

  const isStartOfAppSegment = (element: number, i: number, image: Uint8Array) => element == FF && image[i + 1] == marker

  let result: Uint8Array[] = []
  let remainderData = image

  while (remainderData.length > 0) {
    const segmentStartIndex = remainderData.findIndex(isStartOfAppSegment)

    if (segmentStartIndex === -1) {
      break
    }

    // The next two bytes are the size of the APP segment.
    const segmentSize = numberFromBytes(remainderData[segmentStartIndex + 2], remainderData[segmentStartIndex + 3])

    // We want the bytes from after the 'size' marker until the end of data. So we start from
    // four (two for the APP marker and two for the size.)
    // 'size' excludes the APP marker, but includes the 'size' bytes. So we add 2 bytes to it.
    result.push(remainderData.subarray(segmentStartIndex + 4, segmentStartIndex + 2 + segmentSize))

    remainderData = remainderData.subarray(segmentStartIndex + segmentSize + 1)
  }

  return result
}

/**
 * @internal
 * Finds and returns XMP data as string.
 * Returns 'undefined' if nothing found.
 */
export const jpegExtractXMP = (image: Uint8Array): string | undefined => {
  if (image.length < 3) {
    throw Error('The file is empty or is not an image')
  }
  if (!isJpeg(image)) {
    throw Error('The file is not a JPEG file.')
  }

  // Finding an APP1 segment that starts with the XMP identifier
  const foundSegments = extractAppSegments(image, APP1).filter((segment) => {
    // The structure of the segment is:
    // | Marker (0xFFE1) | Length (2 bytes) | Identifier | Null byte (0x00)
    const nullIndex = segment.findIndex((element) => element === 0x00)
    const Identifier = binArray2String(segment.subarray(0, nullIndex))
    return Identifier === 'http://ns.adobe.com/xap/1.0/'
  })

  if (foundSegments.length === 0) {
    return undefined
  }
  if (foundSegments.length > 1) {
    throw Error('Found more than one XMP segment inside the image.')
  }
  const xmpSegment = foundSegments[0]

  // XXX: Can we change the algorithm so we don't have to search for the 'null' twice?
  const nullIndex = xmpSegment.findIndex((element) => element === 0x00)
  return binArray2String(xmpSegment.subarray(nullIndex + 1))
}
