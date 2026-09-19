import { describe, expect, it } from 'vitest'
import { isConfigDirty } from '../../app/utils/isConfigDirty'

const published = { terms: { cabin_deposit_pct: 10 } }

describe('isConfigDirty', () => {
  it('stays dirty for an invalid edit even when changes is empty', () => {
    expect(isConfigDirty({
      inFlight: false,
      errors: { 'terms.cabin_deposit_pct': ['Must be between 0 and 100.'] },
      changes: [],
      draft: { terms: { cabin_deposit_pct: 200 } },
      published
    })).toBe(true)
  })

  it('uses the change list when the draft is valid', () => {
    expect(isConfigDirty({
      inFlight: false,
      errors: {},
      changes: [{ path: 'terms.cabin_deposit_pct' }],
      draft: { terms: { cabin_deposit_pct: 15 } },
      published
    })).toBe(true)

    expect(isConfigDirty({
      inFlight: false,
      errors: {},
      changes: [],
      draft: published,
      published
    })).toBe(false)
  })

  it('treats an empty errors array as no errors', () => {
    expect(isConfigDirty({
      inFlight: false,
      errors: [],
      changes: [],
      draft: published,
      published
    })).toBe(false)
  })

  it('falls back to deep-equal while a validation is in flight', () => {
    expect(isConfigDirty({
      inFlight: true,
      errors: {},
      changes: [],
      draft: { terms: { cabin_deposit_pct: 15 } },
      published
    })).toBe(true)

    expect(isConfigDirty({
      inFlight: true,
      errors: {},
      changes: [],
      draft: published,
      published
    })).toBe(false)
  })
})
