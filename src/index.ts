import { xmp2js, XMP } from '@aidin36/xmp2js'
import { jpegExtractXMP } from './jpegUtils'
import { heicExtractXmp } from './heicUtils'

export { XMP, XMPNode } from '@aidin36/xmp2js'

/**
 * Extracts the XMP string from a JPEG file.
 * It returns the string as-is without modifications.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns XMP as a string, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromJpeg = (image: Uint8Array): string | undefined => jpegExtractXMP(image)

/**
 * Extracts the XMP from a JPEG file, and transforms it to a JS Object.
 * It uses the '@aidin36/xmp2js' for the transformation. You can read the documents
 * of '@aidin36/xmp2js' to learn more about the output format.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns A JS Object, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromJpegAsJs = (image: Uint8Array): XMP | undefined => {
  const xmpString = jpegExtractXMP(image)
  if (xmpString == null || xmpString.length === 0) {
    return undefined
  }
  return xmp2js(xmpString)
}

/**
 * This is the most portable way of reading the data. Because not every
 * Javascript environment supports TextDecoder. In those cases, you can call
 * this function and decode the output using what is available.
 *
 * If your environment has TextDecoder, or if you have a polyfill of it in your
 * application, you can use 'readXmpFromHeic' function to get a decoded string.
 *
 * Note that the output is encoded as UTF-8. Javascript's strings are UTF-16.
 * So you need to decode the output from UTF-8.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @returns XMP as a UTF-8 byte array, or undefined if no XMP data found in the
 *   provided file.
 */
export const readXmpFromHeicBinary = (image: Uint8Array): Uint8Array | undefined => heicExtractXmp(image)

/**
 * Extracts the XMP string from a HEIC file.
 * It returns the string as-is without modifications.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @returns XMP as a string, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromHeic = (image: Uint8Array): string | undefined => {
  if (TextDecoder === undefined) {
    throw Error('This method needs TextDecoder which is not available in your environment. You can try other methods.')
  }

  const xmpBinary = heicExtractXmp(image)
  if (xmpBinary == null) {
    return undefined
  }

  const decoder = new TextDecoder('UTF-8')
  return decoder.decode(xmpBinary)
}
