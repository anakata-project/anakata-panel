import { describe, expect, it } from 'vitest'
import {
  defaultDepartureId,
  npsScoreClass,
  prefStatusClass
} from '../../app/components/guest-experience/guestExperienceHelpers'

describe('guestExperienceHelpers', () => {
  it('maps preference status onto the prototype pills', () => {
    expect(prefStatusClass('ANSWERED')).toBe('p-conf')
    expect(prefStatusClass('SENT_NO_REPLY')).toBe('p-hold')
    expect(prefStatusClass('SCHEDULED')).toBe('p-pend')
  })

  it('colours a score from the API thresholds', () => {
    expect(npsScoreClass(6, 7, 8)).toBe('p-canc')
    expect(npsScoreClass(7, 7, 8)).toBe('p-pend')
    expect(npsScoreClass(8, 7, 8)).toBe('p-conf')
    expect(npsScoreClass(9, 7, 8)).toBe('p-conf')
    expect(npsScoreClass(5, 6, 9)).toBe('p-canc')
    expect(npsScoreClass(6, 6, 9)).toBe('p-pend')
  })

  it('defaults the picker to the next departure, or the latest when all are past', () => {
    const rows = [
      { departure_id: 1, date: '2026-01-04' },
      { departure_id: 2, date: '2026-06-07' },
      { departure_id: 3, date: '2026-12-06' }
    ]

    expect(defaultDepartureId(rows, '2026-06-01')).toBe(2)
    expect(defaultDepartureId(rows, '2026-06-07')).toBe(2)
    expect(defaultDepartureId(rows, '2027-01-01')).toBe(3)
    expect(defaultDepartureId([], '2026-06-01')).toBeNull()
  })
})
