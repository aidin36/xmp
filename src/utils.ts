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

/* eslint-disable no-bitwise */

// At the moment we don't support numbers larger than max UINT32.
// The reason is we have to store them in a bingint, and we can't use biging
// as our array's index.
const maxSupportedInt64 = 4294967295
const maxUint32 = 4294967295
const fourZeros = new Uint8Array([0x00, 0x00, 0x00, 0x00])

/**
 * @internal
 *
 * Javascript strings are UTF-16. But our data is UTF-8.
 * We only use this method to decode ASCII strings. e.g. ID of the Boxes, etc.
 */
export const binArray2String = (array: Uint8Array) => array.reduce((acc, byte) => acc + String.fromCharCode(byte), '')

/**
 * @internal
 *
 * Converts two bytes in big-endian format to an "unsigned 16-bit integer".
 *
 * @param bytes - should have at least 2 bytes in it. The function picks up the first 2 bytes.
 */
export const bytes2Uint16 = (bytes: Uint8Array): number => ((bytes[0] << 8) | bytes[1]) >>> 0

/**
 * @internal
 * Length of 'bytes' should be at least 4. It picks up the first 4 bytes of the array.
 */
export const bytes2Uint32 = (bytes: Uint8Array): number =>
  // The >>> 0 is to ensure it's interpreted as unsigned
  ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0

/**
 * @internal
 * Length of 'bytes' should be at least 8. It picks up the first 8 bytes of the array.
 */
export const bytes2Uint64 = (bytes: Uint8Array): number => {
  if (bytes[3] > 0 || bytes[2] > 0 || bytes[1] > 0 || bytes[0] > 0) {
    throw Error(`bytes2Uint64: The library can't handle numbers greater than ${maxSupportedInt64}`)
  }

  // Javascript doesn't have <<< (unsigned left shift). >>>0 used as a workaround.
  // See: https://stackoverflow.com/questions/6798111/bitwise-operations-on-32-bit-unsigned-ints
  return (
    ((bytes[0] << 56) |
      (bytes[1] << 48) |
      (bytes[2] << 40) |
      (bytes[3] << 32) |
      (bytes[4] << 24) |
      (bytes[5] << 16) |
      (bytes[6] << 8) |
      bytes[7]) >>>
    0
  )
}

/**
 * @internal
 *
 * Converts Unsigned 16 bits number to big-endian binary array.
 */
export const uint16ToBytes = (num: number) => {
  const array = new Uint8Array(2)

  // >>> is used cause it's unsigned
  array[0] = (num >>> 8) & 0xff
  array[1] = num & 0xff

  return array
}

/**
 * @internal
 *
 * Converts Unsigned 32 bits number to big-endian binary array.
 */
export const uint32ToBytes = (num: number) => {
  if (num > maxUint32) {
    throw Error(`uint32ToBytes: ${num} is larger than maximum UINT32`)
  }

  const array = new Uint8Array(4)

  // >>> is used cause it's unsigned
  array[0] = (num >>> 24) & 0xff
  array[1] = (num >>> 16) & 0xff
  array[2] = (num >>> 8) & 0xff
  array[3] = num & 0xff

  return array
}

export const cloneUint8Array = (array: Uint8Array) => {
  const result = new Uint8Array(array.length)
  result.set(array, 0)
  return result
}

export const concatArrays = (...arrays: Uint8Array[]) => {
  // It's 10 times faster than other methods.
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0)

  const result = new Uint8Array(totalLength)

  let offset = 0

  // Copy each Uint8Array into the result array
  for (let i = 0; i < arrays.length; i++) {
    result.set(arrays[i], offset)
    offset += arrays[i].length
  }

  return result
}

/**
 * @internal
 *
 * Converts Unsigned 64 bits number to big-endian binary array.
 */
export const uint64ToBytes = (num: number) => {
  if (num > maxSupportedInt64) {
    throw Error(`uint64ToBytes: The library can't handle numbers greater than ${maxSupportedInt64}`)
  }

  // At the moment, we don't support any numbers above uint32.
  return concatArrays(fourZeros, uint32ToBytes(num))
}
