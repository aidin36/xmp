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
import fs from 'fs'

import { readXmpFromJpeg, readXmpFromJpegAsJs } from '../src/'
import { iptcStd2024Xmp, iptcStd2024Js } from './data/jpegIptcStd2024.1'

describe('JPEG std 2024.1 file', () => {
  const fileContent = new Uint8Array(fs.readFileSync('./tests/images/IPTC-PhotometadataRef-Std2024.1.jpg'))

  it('should read the file as string', () => {
    expect(readXmpFromJpeg(fileContent)).toEqual(iptcStd2024Xmp)
  })

  it('should read the file as JS Object', () => {
    expect(readXmpFromJpegAsJs(fileContent)).toEqual(iptcStd2024Js)
  })
})
