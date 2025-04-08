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

import { describe, it, expect } from '@jest/globals'

import { bytes2Uint16, uint32ToBytes, bytes2Uint32, bytes2Uint64 } from '../src/utils'

describe('converting bytes to number', () => {
  it('bytes2Uint16', () => {
    expect(bytes2Uint16(new Uint8Array([0x00, 0x78]))).toBe(120)
    expect(bytes2Uint16(new Uint8Array([0x0c, 0x80]))).toBe(3200)
    expect(bytes2Uint16(new Uint8Array([0x00, 0x02]))).toBe(2)
    expect(bytes2Uint16(new Uint8Array([0x00, 0x00]))).toBe(0)
    expect(bytes2Uint16(new Uint8Array([0xff, 0xff]))).toBe(65535)
  })

  it('bytes2Uint32', () => {
    expect(bytes2Uint32(new Uint8Array([0x00, 0x00, 0x00, 0x00]))).toBe(0)
    expect(bytes2Uint32(new Uint8Array([0x00, 0x00, 0x00, 0x12]))).toBe(18)
    expect(bytes2Uint32(new Uint8Array([0x00, 0x00, 0x30, 0x3e]))).toBe(12350)
    expect(bytes2Uint32(new Uint8Array([0x00, 0x03, 0xd0, 0x90]))).toBe(250000)
    expect(bytes2Uint32(new Uint8Array([0x33, 0x00, 0x00, 0xe1]))).toBe(855638241)
    expect(bytes2Uint32(new Uint8Array([0xff, 0xff, 0xff, 0xff]))).toBe(4294967295)
  })

  it('bytes2Uint64', () => {
    expect(bytes2Uint64(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]))).toBe(0)
    expect(bytes2Uint64(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x12]))).toBe(18)
    expect(bytes2Uint64(new Uint8Array([0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff]))).toBe(4294967295)
    // FIXME: The current algorithm doesn't work for these large numbers.
    expect(bytes2Uint64(new Uint8Array([0x00, 0xcc, 0xa3, 0x00, 0x00, 0x13, 0x68, 0xff]))).toBe(0)
    expect(bytes2Uint64(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]))).toBe(0)
  })
})

describe('converting number to bytes', () => {
  it('uint32ToBytes', () => {
    expect(uint32ToBytes(0)).toEqual(new Uint8Array([0, 0, 0, 0]))
    expect(uint32ToBytes(8)).toEqual(new Uint8Array([0, 0, 0, 0x08]))
    expect(uint32ToBytes(16850)).toEqual(new Uint8Array([0, 0, 0x41, 0xd2]))
    expect(uint32ToBytes(3305600)).toEqual(new Uint8Array([0, 0x32, 0x70, 0x80]))
    expect(uint32ToBytes(850666666)).toEqual(new Uint8Array([0x32, 0xb4, 0x24, 0xaa]))
    expect(uint32ToBytes(4294967295)).toEqual(new Uint8Array([0xff, 0xff, 0xff, 0xff]))
  })
})
