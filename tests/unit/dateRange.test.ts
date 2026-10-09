import { describe, expect, it } from 'vitest'
import {
  addMonths,
  anchorToday,
  calendarYear,
  daysBetween,
  formatRangeDate,
  isRangeActive,
  matchingPreset,
  normalizeRange,
  resolveDateRange,
  shiftRange,
  winterSeason,
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

  it('resolves next 30 days and the cool-season window', () => {
    expect(resolveDateRange('next30', today)).toEqual({ from: '2029-06-01', to: '2029-07-01' })
    expect(winterSeason('2026-10-09')).toEqual({ from: '2026-06-01', to: '2026-11-30' })
    expect(winterSeason('2026-12-15')).toEqual({ from: '2027-06-01', to: '2027-11-30' })
    expect(winterSeason('2026-03-01')).toEqual({ from: '2026-06-01', to: '2026-11-30' })
  })

  it('shifts a window by its span and anchors it on today', () => {
    expect(daysBetween('2029-06-01', '2029-06-11')).toBe(10)
    expect(shiftRange('2029-06-01', '2029-06-11', -1)).toEqual({
      from: '2029-05-22',
      to: '2029-06-01'
    })
    expect(anchorToday('2029-06-01', '2029-06-11', '2029-08-01')).toEqual({
      from: '2029-08-01',
      to: '2029-08-11'
    })
    expect(anchorToday(null, null, '2029-06-01')).toEqual({
      from: '2029-06-01',
      to: '2029-12-01'
    })
  })

  it('matches the visible presets and formats the field label', () => {
    expect(matchingPreset(null, null, today)).toBe('all')
    expect(matchingPreset('2029-06-01', '2029-07-01', today)).toBe('next30')
    expect(matchingPreset('2029-06-01', '2029-08-01', today)).toBe('custom')
    expect(formatRangeDate('2026-10-09')).toBe('Fri 09 Oct 2026')
  })
})
