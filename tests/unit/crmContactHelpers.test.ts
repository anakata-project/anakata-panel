import { describe, expect, it } from 'vitest'
import type { ContactMerge } from '../../app/types/api'
import {
  consentPillLabel,
  emailConflictId,
  instantsEqual,
  isUndoWindowOpen,
  lifecyclePillClass,
  matchMergeForTimeline,
  matchPartnerByEmail,
  parseEmailConflictContactId,
  segmentPillClass
} from '../../app/components/crm/contactHelpers'

function merge(partial: Partial<ContactMerge> & Pick<ContactMerge, 'id' | 'survivor_id' | 'merged_at'>): ContactMerge {
  return {
    loser_id: 2,
    reason: 'duplicate',
    merged_by: 1,
    undone_at: null,
    undone_by: null,
    undo_reason: null,
    erased_at: null,
    repointed_rows: [],
    ...partial
  }
}

describe('segmentPillClass', () => {
  it('maps HIGH MID NEW to prototype classes', () => {
    expect(segmentPillClass('HIGH')).toBe('hi')
    expect(segmentPillClass('MID')).toBe('mid')
    expect(segmentPillClass('NEW')).toBe('new')
  })
})

describe('lifecyclePillClass', () => {
  it('returns an empty class for every lifecycle', () => {
    expect(lifecyclePillClass('BOOKED')).toBe('')
    expect(lifecyclePillClass('AGENT')).toBe('')
  })
})

describe('consentPillLabel', () => {
  it('labels marketing and transactional-only', () => {
    expect(consentPillLabel(true)).toBe('MKT ✓')
    expect(consentPillLabel(false)).toBe('TX ONLY')
  })
})

describe('parseEmailConflictContactId', () => {
  it('reads the id from the server message', () => {
    expect(parseEmailConflictContactId(
      'That email belongs to contact #12 (Ada). Merge the contacts to keep a single record.'
    )).toBe(12)
  })

  it('returns null when the message has no contact id', () => {
    expect(parseEmailConflictContactId('That email is already in use.')).toBeNull()
    expect(parseEmailConflictContactId('')).toBeNull()
  })
})

describe('emailConflictId', () => {
  it('prefers conflicting_contact and falls back to the message', () => {
    expect(emailConflictId(
      { conflictingContact: { id: 12, name: 'Ada' } },
      'That email is already in use.'
    )).toBe(12)
    expect(emailConflictId(
      { message: 'That email belongs to contact #4 (Bea).' },
      'That email belongs to contact #4 (Bea).'
    )).toBe(4)
    expect(emailConflictId({}, 'That email is already in use.')).toBeNull()
  })
})

describe('instantsEqual', () => {
  it('treats mixed ISO forms as the same instant', () => {
    expect(instantsEqual('2026-01-15T12:00:00Z', '2026-01-15T12:00:00+00:00')).toBe(true)
    expect(instantsEqual('2026-01-15T12:00:00.000Z', '2026-01-15T12:00:00+00:00')).toBe(true)
    expect(instantsEqual('2026-01-15T12:00:00Z', '2026-01-15T12:00:01Z')).toBe(false)
    expect(instantsEqual('not-a-date', '2026-01-15T12:00:00Z')).toBe(false)
  })
})

describe('matchMergeForTimeline', () => {
  it('matches survivor_id and equal timestamps across ISO formats', () => {
    const rows = [
      merge({ id: 9, survivor_id: 4, merged_at: '2026-01-15T12:00:00+00:00' })
    ]

    expect(matchMergeForTimeline('2026-01-15T12:00:00.000Z', 4, rows)).toEqual({
      kind: 'one',
      merge: rows[0]
    })
    expect(matchMergeForTimeline('2026-01-15T12:00:00Z', 5, rows)).toEqual({ kind: 'none' })
  })

  it('returns ambiguous when two live merges share the instant', () => {
    const rows = [
      merge({ id: 1, survivor_id: 4, merged_at: '2026-01-15T12:00:00Z' }),
      merge({ id: 2, survivor_id: 4, merged_at: '2026-01-15T12:00:00+00:00' })
    ]

    expect(matchMergeForTimeline('2026-01-15T12:00:00Z', 4, rows)).toEqual({ kind: 'ambiguous' })
  })

  it('ignores undone merges', () => {
    const rows = [
      merge({
        id: 1,
        survivor_id: 4,
        merged_at: '2026-01-15T12:00:00Z',
        undone_at: '2026-01-16T00:00:00Z'
      })
    ]

    expect(matchMergeForTimeline('2026-01-15T12:00:00Z', 4, rows)).toEqual({ kind: 'none' })
  })
})

describe('isUndoWindowOpen', () => {
  const mergedAt = '2026-01-01T00:00:00.000Z'
  const start = Date.parse(mergedAt)
  const day = 24 * 60 * 60 * 1000

  it('is open just inside 30 days', () => {
    expect(isUndoWindowOpen(mergedAt, new Date(start + (30 * day) - 1))).toBe(true)
  })

  it('is closed at exactly 30 days', () => {
    expect(isUndoWindowOpen(mergedAt, new Date(start + (30 * day)))).toBe(false)
  })

  it('is closed just outside 30 days', () => {
    expect(isUndoWindowOpen(mergedAt, new Date(start + (30 * day) + 1))).toBe(false)
  })

  it('hides undo for an invalid or missing date', () => {
    expect(isUndoWindowOpen('not-a-date')).toBe(false)
    expect(isUndoWindowOpen(null)).toBe(false)
    expect(isUndoWindowOpen(undefined)).toBe(false)
    expect(isUndoWindowOpen('')).toBe(false)
  })
})

describe('matchPartnerByEmail', () => {
  it('returns the unique case-insensitive match and nothing otherwise', () => {
    const agencies = [
      { id: 1, email: 'Ada@Agency.test' },
      { id: 2, email: 'other@agency.test' }
    ]

    expect(matchPartnerByEmail(agencies, '  ada@agency.test  ')?.id).toBe(1)
    expect(matchPartnerByEmail(agencies, 'missing@agency.test')).toBeNull()
    expect(matchPartnerByEmail([
      { id: 1, email: 'ada@agency.test' },
      { id: 2, email: 'ADA@agency.test' }
    ], 'ada@agency.test')).toBeNull()
  })
})
