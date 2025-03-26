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
export const bytes2Uint16 = (bytes: Uint8Array): number => (bytes[0] << 8) | bytes[1]

/**
 * @internal
 * Length of 'bytes' should be at least 4. It picks up the first 4 bytes of the array.
 */
export const bytes2Uint32 = (bytes: Uint8Array): number =>
  (bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]

/**
 * @internal
 * Length of 'bytes' should be at least 8. It picks up the first 8 bytes of the array.
 */
export const bytes2Uint64 = (bytes: Uint8Array): number =>
  (bytes[0] << 56) |
  (bytes[1] << 48) |
  (bytes[2] << 40) |
  (bytes[3] << 32) |
  (bytes[4] << 24) |
  (bytes[5] << 16) |
  (bytes[6] << 8) |
  bytes[7]
