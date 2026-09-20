import { describe, expect, it } from 'vitest'
import {
  addMonths,
  calendarYear,
  isRangeActive,
  normalizeRange,
  resolveDateRange,
  yearPresets
} from '../../app/components/lists/dateRange'

const today = '2029-06-01'

describe('dateRange', () => {
  it('computes year presets from today, not 2026–2028', () => {
    expect(calendarYear(today)).toBe(2029)
    expect(yearPresets(today)).toEqual([
      { key: 'y2029', year: 2029 },
      { key: 'y2030', year: 2030 },
      { key: 'y2031', year: 2031 }
    ])
  })

  it('resolves relative presets against a fixed today', () => {
    expect(resolveDateRange('all', today)).toEqual({ from: null, to: null })
    expect(resolveDateRange('custom', today)).toEqual({ from: null, to: null })
    expect(resolveDateRange('last30', today)).toEqual({ from: '2029-05-02', to: '2029-06-01' })
    expect(resolveDateRange('last90', today)).toEqual({ from: '2029-03-03', to: '2029-06-01' })
    expect(resolveDateRange('next90', today)).toEqual({ from: '2029-06-01', to: '2029-08-30' })
    expect(resolveDateRange('next12', today)).toEqual({ from: '2029-06-01', to: '2030-06-01' })
  })

  it('resolves computed year keys to 1 Jan–31 Dec', () => {
    expect(resolveDateRange('y2029', today)).toEqual({ from: '2029-01-01', to: '2029-12-31' })
    expect(resolveDateRange('y2031', today)).toEqual({ from: '2031-01-01', to: '2031-12-31' })
  })

  it('normalizes a reversed custom range and reports active state', () => {
    expect(normalizeRange('2029-08-01', '2029-06-01')).toEqual({
      from: '2029-06-01',
      to: '2029-08-01'
    })
    expect(isRangeActive(null, null)).toBe(false)
    expect(isRangeActive('2029-06-01', null)).toBe(true)
  })

  it('adds calendar months on the UTC date', () => {
    expect(addMonths('2026-09-20', 6)).toBe('2027-03-20')
    expect(addMonths('2027-11-07', 0)).toBe('2027-11-07')
  })
})
