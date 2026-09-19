import { describe, expect, it } from 'vitest'
import { cloneDocument, documentsEqual } from '../../app/utils/documentsEqual'

describe('documentsEqual', () => {
  it('ignores associative key order', () => {
    expect(documentsEqual(
      { terms: { b: 2, a: 1 }, years: [2027] },
      { years: [2027], terms: { a: 1, b: 2 } }
    )).toBe(true)
  })

  it('keeps list order', () => {
    expect(documentsEqual({ days: [21, 7] }, { days: [7, 21] })).toBe(false)
  })

  it('treats a changed leaf as different', () => {
    expect(documentsEqual({ terms: { cabin_deposit_pct: 10 } }, { terms: { cabin_deposit_pct: 15 } })).toBe(false)
  })
})

describe('cloneDocument', () => {
  it('returns a deep copy', () => {
    const source = { terms: { cabin_deposit_pct: 10 } }
    const copy = cloneDocument(source)
    copy.terms.cabin_deposit_pct = 15
    expect(source.terms.cabin_deposit_pct).toBe(10)
  })
})
