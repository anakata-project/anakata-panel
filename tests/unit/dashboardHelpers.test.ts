import { describe, expect, it } from 'vitest'
import {
  occupancyBarWidth,
  occupancyIsLow,
  ratioPercentLabel,
  SELECT_ALL,
  selectedId,
  thresholdRatio,
  withSelectAll
} from '../../app/components/commercial/dashboardHelpers'

describe('dashboard occupancy display', () => {
  it('prints the API ratio as a percent and dashes a zero', () => {
    expect(ratioPercentLabel('0.6111')).toBe('61.11%')
    expect(ratioPercentLabel('1.0000')).toBe('100.00%')
    expect(ratioPercentLabel('0.0500')).toBe('5.00%')
    expect(ratioPercentLabel('0.0000')).toBeNull()
    expect(ratioPercentLabel(null)).toBeNull()
  })

  it('sizes the bar from the ratio string', () => {
    expect(occupancyBarWidth('0.6111')).toBe('61.11%')
    expect(occupancyBarWidth('0.0000')).toBe('0.00%')
    expect(occupancyBarWidth(null)).toBe('0%')
  })

  it('prefixes All with a non-empty value (Reka SelectItem forbids "")', () => {
    const items = withSelectAll('All yachts', [{ label: 'ANAMARA', value: '1' }])

    expect(SELECT_ALL).not.toBe('')
    expect(items.map(item => item.value)).toEqual([SELECT_ALL, '1'])
    expect(items.every(item => item.value !== '')).toBe(true)
    expect(selectedId(SELECT_ALL)).toBeNull()
    expect(selectedId('12')).toBe(12)
    expect(selectedId('0')).toBeNull()
  })

  it('marks coral only below the published percent', () => {
    expect(thresholdRatio(40)).toBe('0.4000')
    expect(thresholdRatio(5)).toBe('0.0500')
    expect(thresholdRatio(100)).toBe('1.0000')
    expect(occupancyIsLow('0.3999', 40)).toBe(true)
    expect(occupancyIsLow('0.0000', 40)).toBe(true)
    expect(occupancyIsLow('0.4000', 40)).toBe(false)
    expect(occupancyIsLow('0.6111', 40)).toBe(false)
    expect(occupancyIsLow('1.0000', 40)).toBe(false)
    expect(occupancyIsLow(null, 40)).toBe(false)
    expect(occupancyIsLow('0.1000', null)).toBe(false)
  })
})
