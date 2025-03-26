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

import { bytes2Uint16 } from '../src/utils'

describe('converting bytes to number', () => {
  it('bytes2Uint16', () => {
    expect(bytes2Uint16(new Uint8Array([0x00, 0x78]))).toBe(120)
    expect(bytes2Uint16(new Uint8Array([0x0c, 0x80]))).toBe(3200)
    expect(bytes2Uint16(new Uint8Array([0x00, 0x02]))).toBe(2)
    expect(bytes2Uint16(new Uint8Array([0x00, 0x00]))).toBe(0)
    expect(bytes2Uint16(new Uint8Array([0xff, 0xff]))).toBe(65535)
  })
})
