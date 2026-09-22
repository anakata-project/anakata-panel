import { describe, expect, it } from 'vitest'
import {
  manifestBarWidth,
  manifestNoticeOffsets,
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

  it('reads notice offsets from the rows and never fills a missing class', () => {
    expect(manifestNoticeOffsets([
      { charter: false, dpng_offset_days: 15, captain_offset_days: 7 },
      { charter: true, dpng_offset_days: 30, captain_offset_days: 7 }
    ])).toEqual({ fit: 15, charter: 30, captain: 7 })

    expect(manifestNoticeOffsets([
      { charter: false, dpng_offset_days: 15, captain_offset_days: 7 }
    ])).toEqual({ fit: 15, charter: null, captain: 7 })

    expect(manifestNoticeOffsets([])).toEqual({ fit: null, charter: null, captain: null })
  })

  it('labels an offset from the API day count', () => {
    expect(offsetLabel(15)).toBe('T−15')
    expect(offsetLabel(null)).toBe('—')
    expect(manifestBarWidth(2, 4)).toBe('50%')
    expect(manifestBarWidth(0, 0)).toBe('0%')
  })
})
