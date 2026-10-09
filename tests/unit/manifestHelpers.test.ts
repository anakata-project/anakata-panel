import { describe, expect, it } from 'vitest'
import {
  manifestBarWidth,
  manifestStatusClass,
  offsetLabel
} from '../../app/components/documents/manifestHelpers'

describe('manifestHelpers', () => {
  it('maps the API status strings onto pills', () => {
    expect(manifestStatusClass('READY')).toBe('p-conf')
    expect(manifestStatusClass('OVERDUE DATA')).toBe('p-canc')
    expect(manifestStatusClass('1 PASSENGER PENDING')).toBe('p-pend')
    expect(manifestStatusClass('3 PASSENGERS PENDING')).toBe('p-pend')
    expect(manifestStatusClass('OTHER')).toBe('')
  })

  it('labels an offset from the API day count', () => {
    expect(offsetLabel(15)).toBe('T−15')
    expect(offsetLabel(null)).toBe('—')
    expect(manifestBarWidth(2, 4)).toBe('50%')
    expect(manifestBarWidth(0, 0)).toBe('0%')
  })
})
