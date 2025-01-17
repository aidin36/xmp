import { describe, it, expect } from '@jest/globals'

import { numberFromBytes } from '../src/utils'

describe('numberFromBytes function', () => {
  it('should convert bytes correctly', () => {
    expect(numberFromBytes(0x00, 0x78)).toBe(120)
    expect(numberFromBytes(0x0c, 0x80)).toBe(3200)
    expect(numberFromBytes(0x00, 0x02)).toBe(2)
    expect(numberFromBytes(0x00, 0x00)).toBe(0)
    expect(numberFromBytes(0xff, 0xff)).toBe(65535)
  })
})
