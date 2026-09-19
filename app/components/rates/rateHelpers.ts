import type { ComputedRef, InjectionKey } from 'vue'

export type RoundTo = 1 | 10 | 50 | 100

export type RateCategoryKey = 'suite_pp' | 'owner_pp' | 'charter_week'

export type RateYearDraft = {
  year: number
  suite_pp: number | null
  owner_pp: number | null
  charter_week: number | null
}

export type RateTermsDraft = {
  cabin_deposit_pct: number | null
  cabin_balance_days: number | null
  charter_deposit_pct: number | null
  charter_deposit_business_days: number | null
  charter_balance_days: number | null
}

export type RateRulesDraft = {
  single_supplement_pct: number | null
  triple_discount_pct: number | null
  child_discount_pct: number | null
  child_discounts_per_adult: number | null
  child_discounts_per_cabin: number | null
  back_to_back_pct: number | null
  festive_supplement_pp: number | null
  festive_supplement_charter: number | null
}

export type RatesDraft = {
  currency: string
  years: Array<RateYearDraft>
  terms: RateTermsDraft
  rules: RateRulesDraft
}

export const RATE_CATEGORIES: Array<{
  key: RateCategoryKey
  labelKey: 'rates.catSuite' | 'rates.catOwner' | 'rates.catCharter'
  kind: 'cabin' | 'charter'
}> = [
  { key: 'suite_pp', labelKey: 'rates.catSuite', kind: 'cabin' },
  { key: 'owner_pp', labelKey: 'rates.catOwner', kind: 'cabin' },
  { key: 'charter_week', labelKey: 'rates.catCharter', kind: 'charter' }
]

export const RATES_DRAFT_KEY: InjectionKey<ComputedRef<RatesDraft | null>> = Symbol('ratesDraft')

export const RATE_FIELD_LABELS: Record<string, string> = {
  'currency': 'Currency',
  'terms.cabin_deposit_pct': 'Cabin deposit %',
  'terms.cabin_balance_days': 'Cabin balance — days before',
  'terms.charter_deposit_pct': 'Charter deposit %',
  'terms.charter_deposit_business_days': 'Charter deposit — business days',
  'terms.charter_balance_days': 'Charter balance — days before',
  'rules.single_supplement_pct': 'Single supplement %',
  'rules.triple_discount_pct': 'Triple sharing discount %',
  'rules.child_discount_pct': 'Child discount %',
  'rules.child_discounts_per_adult': 'Child discounts per adult',
  'rules.child_discounts_per_cabin': 'Child discounts per cabin',
  'rules.back_to_back_pct': 'Back-to-back discount %',
  'rules.festive_supplement_pp': 'Festive supplement / guest',
  'rules.festive_supplement_charter': 'Festive supplement / charter'
}

export function rateFieldLabels(draft: RatesDraft): Record<string, string> {
  const labels = { ...RATE_FIELD_LABELS }

  draft.years.forEach((row, index) => {
    labels[`years.${index}.suite_pp`] = `Suite ${row.year}`
    labels[`years.${index}.owner_pp`] = `Owner's Suite ${row.year}`
    labels[`years.${index}.charter_week`] = `Charter ${row.year}`
  })

  return labels
}

export function roundRate(value: number, roundTo: RoundTo): number {
  if (roundTo > 1) {
    return Math.round(value / roundTo) * roundTo
  }

  return Math.round(value)
}

function grow(value: number | null, factor: number, roundTo: RoundTo): number | null {
  if (value === null) {
    return null
  }

  return roundRate(value * factor, roundTo)
}

export function fillYearFromPrevious(
  years: Array<RateYearDraft>,
  year: number,
  increasePct: number,
  roundTo: RoundTo
): Array<RateYearDraft> {
  const index = years.findIndex(row => row.year === year)

  if (index < 1) {
    return years
  }

  const previous = years[index - 1]

  if (!previous) {
    return years
  }

  const factor = 1 + increasePct / 100

  return years.map((row, rowIndex) => {
    if (rowIndex !== index) {
      return row
    }

    return {
      year: row.year,
      suite_pp: grow(previous.suite_pp, factor, roundTo),
      owner_pp: grow(previous.owner_pp, factor, roundTo),
      charter_week: grow(previous.charter_week, factor, roundTo)
    }
  })
}

export function addNextYear(
  years: Array<RateYearDraft>,
  increasePct: number,
  roundTo: RoundTo
): Array<RateYearDraft> {
  const last = years[years.length - 1]

  if (!last) {
    return years
  }

  const factor = 1 + increasePct / 100

  return [
    ...years,
    {
      year: last.year + 1,
      suite_pp: grow(last.suite_pp, factor, roundTo),
      owner_pp: grow(last.owner_pp, factor, roundTo),
      charter_week: grow(last.charter_week, factor, roundTo)
    }
  ]
}

export function removeLastYear(years: Array<RateYearDraft>): Array<RateYearDraft> {
  // TODO(Sprint 3): block removing a year that has departures (the API will also refuse then).
  if (years.length <= 1) {
    return years
  }

  return years.slice(0, -1)
}

export function yoyPercent(current: number, previous: number): string {
  const pct = ((current - previous) / previous) * 100
  const sign = current >= previous ? '+' : ''

  return `${sign}${pct.toFixed(1)}%`
}

export function yoyLine(current: number | null, previous: number | null, previousYear: number): string | null {
  if (current === null || previous === null || previous === 0) {
    return null
  }

  return `${yoyPercent(current, previous)} vs ${previousYear}`
}

export function depositBalanceText(
  terms: RateTermsDraft,
  kind: 'cabin' | 'charter'
): string {
  if (kind === 'charter') {
    const deposit = terms.charter_deposit_pct
    const days = terms.charter_balance_days

    if (deposit === null || days === null) {
      return '—'
    }

    return `${deposit}% · ${100 - deposit}% at T−${days}`
  }

  const deposit = terms.cabin_deposit_pct
  const days = terms.cabin_balance_days

  if (deposit === null || days === null) {
    return '—'
  }

  return `${deposit}% · ${100 - deposit}% at T−${days}`
}
