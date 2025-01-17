import { jpegExtractXMP } from './jpegUtils'
import { xmp2js, XMP } from '@aidin36/xmp2js'

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
