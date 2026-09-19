import { describe, expect, it } from 'vitest'
import { applyPublishOutcome, normaliseErrors } from '../../app/utils/publishOutcome'

describe('normaliseErrors', () => {
  it('strips the document. prefix from 422 keys', () => {
    expect(normaliseErrors({
      'document.terms.cabin_deposit_pct': ['Must be between 0 and 100.']
    })).toEqual({
      'terms.cabin_deposit_pct': ['Must be between 0 and 100.']
    })
  })
})

describe('applyPublishOutcome', () => {
  it('maps 201 to published', () => {
    expect(applyPublishOutcome(201, { version: 4 })).toEqual({
      kind: 'published',
      version: 4
    })
  })

  it('maps 409 to conflict', () => {
    expect(applyPublishOutcome(409, {
      message: 'Someone published a newer version (v3) while you were editing. Reload to see it; your changes were not saved.'
    })).toEqual({
      kind: 'conflict',
      message: 'Someone published a newer version (v3) while you were editing. Reload to see it; your changes were not saved.'
    })
  })

  it('maps 422 to invalid and normalises keys', () => {
    expect(applyPublishOutcome(422, {
      message: 'The document.terms.cabin_deposit_pct field must be between 0 and 100.',
      errors: {
        'document.terms.cabin_deposit_pct': ['The document.terms.cabin_deposit_pct field must be between 0 and 100.']
      }
    })).toEqual({
      kind: 'invalid',
      message: 'The document.terms.cabin_deposit_pct field must be between 0 and 100.',
      errors: {
        'terms.cabin_deposit_pct': ['The document.terms.cabin_deposit_pct field must be between 0 and 100.']
      }
    })
  })
})
