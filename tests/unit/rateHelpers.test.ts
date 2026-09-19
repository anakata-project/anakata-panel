import { describe, expect, it } from 'vitest'
import {
  addNextYear,
  fillYearFromPrevious,
  removeLastYear,
  roundRate,
  yoyPercent
} from '../../app/components/rates/rateHelpers'

const year2027 = {
  year: 2027,
  suite_pp: 13300,
  owner_pp: 25000,
  charter_week: 199500
}

const year2028 = {
  year: 2028,
  suite_pp: 13965,
  owner_pp: 26250,
  charter_week: 209475
}

describe('roundRate', () => {
  it('rounds to the nearest USD when the increment is 1', () => {
    expect(roundRate(13965.4, 1)).toBe(13965)
    expect(roundRate(13965.5, 1)).toBe(13966)
  })

  it('rounds to 10 / 50 / 100', () => {
    expect(roundRate(13965, 10)).toBe(13970)
    expect(roundRate(13965, 50)).toBe(13950)
    expect(roundRate(13965, 100)).toBe(14000)
  })
})

describe('fillYearFromPrevious', () => {
  it('fills 2028 from 2027 at +5% nearest USD', () => {
    const filled = fillYearFromPrevious(
      [year2027, { year: 2028, suite_pp: 1, owner_pp: 1, charter_week: 1 }],
      2028,
      5,
      1
    )

    expect(filled[1]).toEqual(year2028)
  })

  it('does not fill the first year', () => {
    expect(fillYearFromPrevious([year2027], 2027, 5, 1)).toEqual([year2027])
  })
})

describe('addNextYear', () => {
  it('appends last+1 at +5% nearest USD', () => {
    const next = addNextYear([year2027], 5, 1)

    expect(next).toEqual([year2027, year2028])
  })
})

describe('removeLastYear', () => {
  it('refuses to remove the only year', () => {
    expect(removeLastYear([year2027])).toEqual([year2027])
  })

  it('removes only the last year', () => {
    expect(removeLastYear([year2027, year2028])).toEqual([year2027])
  })
})

describe('yoyPercent', () => {
  it('formats the prototype +5.0% line', () => {
    expect(yoyPercent(13965, 13300)).toBe('+5.0%')
  })

  it('omits the plus on a drop', () => {
    expect(yoyPercent(12000, 13300)).toBe('-9.8%')
  })
})
