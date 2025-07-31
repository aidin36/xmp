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

import { readXmpFromHeic, writeXmpToHeicAsString } from '../src'
import { heicDigikamTagsXmp } from './data/heicDigikamTags'
import { smallXmp } from './data/smallXmp'
import { parseImageWithLibHeif } from './testHelpers'

describe('HEIC Digikam Tags file', () => {
  it('should extract xmp string', () => {
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/digikam-tags.heic'))

    expect(readXmpFromHeic(fileContent)).toEqual(heicDigikamTagsXmp)
  })

  it('should return undefined when there is no xmp', () => {
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/heic-no-xmp.heic'))

    expect(readXmpFromHeic(fileContent)).toEqual(undefined)
  })

  it('should return undefined when there is no xmp - file has multiple ilocs', () => {
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/heic-no-xmp-multiple-ilocs.heic'))

    expect(readXmpFromHeic(fileContent)).toEqual(undefined)
  })
})

describe('HEIC write', () => {
  it('should write to an empty file', () => {
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/heic-no-xmp.heic'))
    const modifiedImage = writeXmpToHeicAsString(fileContent, heicDigikamTagsXmp)

    expect(readXmpFromHeic(modifiedImage)).toEqual(heicDigikamTagsXmp)
  })

  it('should write to an empty file with some iloc boxes', () => {
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/heic-no-xmp-multiple-ilocs.heic'))
    const modifiedImage = writeXmpToHeicAsString(fileContent, heicDigikamTagsXmp)

    expect(readXmpFromHeic(modifiedImage)).toEqual(heicDigikamTagsXmp)
  })

  it('should update a file', () => {
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/digikam-tags.heic'))
    const modifiedImage = writeXmpToHeicAsString(fileContent, smallXmp)

    expect(readXmpFromHeic(modifiedImage)).toEqual(smallXmp)

    fs.writeFileSync('/tmp/digikam-tags-updated.heic', modifiedImage)
  })

  it('should write and update a file with some iloc boxes', async () => {
    // The file doesn't have a XMP at first.
    const fileContent = new Uint8Array(fs.readFileSync('./tests/images/heic-no-xmp-multiple-ilocs.heic'))

    const imageDataBefore = await parseImageWithLibHeif(fileContent)
    console.log(
      `imageDataBefore: ${imageDataBefore.width}x${imageDataBefore.height} ${imageDataBefore.decodedData.length} bytes`
    )
    const modifiedImage = writeXmpToHeicAsString(fileContent, smallXmp)

    expect(readXmpFromHeic(modifiedImage)).toEqual(smallXmp)

    fs.writeFileSync('/tmp/heic-multiple-ilocs-smallXmp.heic', modifiedImage)

    const modifiedImage2 = writeXmpToHeicAsString(modifiedImage, heicDigikamTagsXmp)
    expect(readXmpFromHeic(modifiedImage2)).toEqual(heicDigikamTagsXmp)

    fs.writeFileSync('/tmp/heic-multiple-ilocs-updated.heic', modifiedImage2)

    // CONTINUE: It fails to parse the image here. But the saved file is valid.
    // Maybe the JS library has an issue.
    // The Digikam file actually breaks after modification.

    const imageDataAfter = await parseImageWithLibHeif(modifiedImage2)
    console.log(
      `imageDataAfter: ${imageDataAfter.width}x${imageDataAfter.height} ${imageDataAfter.decodedData.length} bytes`
    )
    expect(imageDataAfter.width).toEqual(imageDataBefore.width)
    expect(imageDataAfter.height).toEqual(imageDataBefore.height)
    expect(imageDataAfter.decodedData).toEqual(imageDataBefore.decodedData)
  })
})
