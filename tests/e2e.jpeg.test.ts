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
