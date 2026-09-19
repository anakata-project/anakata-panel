import { describe, expect, it } from 'vitest'
import { parseRinValue } from '../../app/utils/parseRinValue'

describe('parseRinValue', () => {
  it('writes null for an empty or blank input', () => {
    expect(parseRinValue('')).toBeNull()
    expect(parseRinValue('   ')).toBeNull()
  })

  it('parses a finite number', () => {
    expect(parseRinValue('12')).toBe(12)
    expect(parseRinValue('12.5')).toBe(12.5)
    expect(parseRinValue('0')).toBe(0)
  })

  it('writes null for a non-finite value', () => {
    expect(parseRinValue('abc')).toBeNull()
    expect(parseRinValue('NaN')).toBeNull()
  })
})
