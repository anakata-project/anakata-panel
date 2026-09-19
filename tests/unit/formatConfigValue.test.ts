import { describe, expect, it } from 'vitest'
import { formatBands, formatConfigValue, formatUsd } from '../../app/utils/formatConfigValue'

describe('formatUsd', () => {
  it('formats whole dollars with a thousands separator', () => {
    expect(formatUsd(13300)).toBe('USD 13,300')
    expect(formatUsd(0)).toBe('USD 0')
  })
})

describe('formatBands', () => {
  it('matches the documented band line', () => {
    expect(formatBands([
      { min_days: 120, penalty_pct: 5 },
      { min_days: 90, penalty_pct: 50 },
      { min_days: 0, penalty_pct: 100 }
    ])).toBe('≥120 d 5% · 90–119 d 50% · 0–89 d 100%')
  })
})

describe('formatConfigValue', () => {
  it('uses the path → format map for money', () => {
    expect(formatConfigValue('years.2027.suite_pp', 13300, {
      years: 'money'
    })).toBe('USD 13,300')
  })

  it('appends % for _pct paths', () => {
    expect(formatConfigValue('terms.cabin_deposit_pct', 10)).toBe('10%')
  })

  it('joins lists with a middle dot', () => {
    expect(formatConfigValue('copy.confirmation_steps', ['A', 'B', 'C'])).toBe('A · B · C')
  })

  it('formats booleans as Yes/No', () => {
    expect(formatConfigValue('fees.show_in_price_panel', true)).toBe('Yes')
    expect(formatConfigValue('fees.show_in_price_panel', false)).toBe('No')
  })

  it('formats cancellation bands', () => {
    expect(formatConfigValue('cancellation.bands', [
      { min_days: 0, penalty_pct: 100 },
      { min_days: 120, penalty_pct: 5 },
      { min_days: 90, penalty_pct: 50 }
    ])).toBe('≥120 d 5% · 90–119 d 50% · 0–89 d 100%')
  })

  it('renders null as an em dash', () => {
    expect(formatConfigValue('discounts.max_total_discount_pct', null)).toBe('—')
  })
})
