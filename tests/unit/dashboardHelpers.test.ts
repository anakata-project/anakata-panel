import { describe, expect, it } from 'vitest'
import {
  occupancyBarWidth,
  occupancyIsLow,
  ratioPercentLabel,
  thresholdRatio
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
