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
