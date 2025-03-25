import { describe, it, expect } from '@jest/globals'
import fs from 'fs'

import { readXmpFromHeic } from '../src'
import { heicDigikamTagsXmp } from './data/heicDigikamTags'

describe('HEIC Digikam Tags file', () => {
  const fileContent = new Uint8Array(fs.readFileSync('./tests/images/digikam-tags.heic'))

  it('should extract xmp string', () => {
    expect(readXmpFromHeic(fileContent)).toEqual(heicDigikamTagsXmp)
  })
})
