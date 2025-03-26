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

import { xmp2js, XMP } from '@aidin36/xmp2js'
import { jpegExtractXMP } from './jpegUtils'
import { heicExtractXmp } from './heicUtils'

export { XMP, XMPNode } from '@aidin36/xmp2js'

/**
 * This is the most portable way of reading the data. Because not every
 * Javascript environment supports TextDecoder. In those cases, you can call
 * this function and decode the output using what is available.
 *
 * If your environment has TextDecoder, or if you have a polyfill of it in your
 * application, you can use 'readXmpFromJpegBinary' function to get a decoded
 * string.
 *
 * Note that the output is encoded as UTF-8. Javascript's strings are UTF-16.
 * So you need to decode the output from UTF-8.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns XMP as a UTF-8 byte array, or undefined if no XMP data found in the
 *   provided file.
 */
export const readXmpFromJpegAsBinary = (image: Uint8Array): Uint8Array | undefined => jpegExtractXMP(image)

/**
 * Extracts the XMP string from a JPEG file.
 * It returns the string as-is without modifications.
 *
 * Note that your Javascript environment should provide TextDecoder or a
 * polyfill of it.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns XMP as a string, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromJpeg = (image: Uint8Array): string | undefined => {
  if (TextDecoder === undefined) {
    throw Error('This method needs TextDecoder which is not available in your environment. You can try other methods.')
  }

  const xmpBinary = jpegExtractXMP(image)
  if (xmpBinary == null) {
    return undefined
  }

  const decoder = new TextDecoder('UTF-8')
  return decoder.decode(xmpBinary)
}
/**
 * Extracts the XMP from a JPEG file, and transforms it to a JS Object.
 * It uses the '@aidin36/xmp2js' for the transformation. You can read the documents
 * of '@aidin36/xmp2js' to learn more about the output format.
 *
 * @param image - Data of the JPEG image in the form of Uint8Array
 * @returns A JS Object, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromJpegAsJs = (image: Uint8Array): XMP | undefined => {
  const xmpString = readXmpFromJpeg(image)
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
export const readXmpFromHeicAsBinary = (image: Uint8Array): Uint8Array | undefined => heicExtractXmp(image)

/**
 * Extracts the XMP string from a HEIC file.
 * It returns the string as-is without modifications.
 *
 * Note that your Javascript environment should provide TextDecoder.
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

/**
 * Extracts the XMP string from a HEIC file, then converts it to a Javascript
 * Object.
 * It uses the '@aidin36/xmp2js' for the transformation. You can read the documents
 * of '@aidin36/xmp2js' to learn more about the output format.
 *
 * Note that your Javascript environment should provide TextDecoder.
 *
 * @param image - Data of the HEIC image in the form of Uint8Array
 * @returns A JS Object, or undefined if no XMP data found in the provided file.
 */
export const readXmpFromHeicAsJs = (image: Uint8Array): XMP | undefined => {
  const xmpStr = readXmpFromHeic(image)
  if (xmpStr == null || xmpStr.length === 0) {
    return undefined
  }
  return xmp2js(xmpStr)
}
