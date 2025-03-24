import { describe, it } from '@jest/globals'
import fs from 'fs'

import { readXmpFromHeic } from '../src'

describe('HEIC Digikam Tags file', () => {
  const fileContent = new Uint8Array(fs.readFileSync('./tests/images/digikam-tags.heic'))

  it('should extract xmp string', () => {
    readXmpFromHeic(fileContent)
  })
})
