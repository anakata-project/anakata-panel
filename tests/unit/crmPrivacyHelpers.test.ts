import { describe, expect, it } from 'vitest'
import { consentStateLabel, subjectRequestDueClass } from '../../app/components/crm/privacyHelpers'

describe('consentStateLabel', () => {
  it('maps the API granted flag', () => {
    expect(consentStateLabel(true)).toBe('OPTED IN')
    expect(consentStateLabel(false)).toBe('NOT OPTED IN')
    expect(consentStateLabel(null)).toBe('NO RECORD')
  })
})

describe('subjectRequestDueClass', () => {
  it('uses the API overdue flag when one is sent', () => {
    expect(subjectRequestDueClass('2026-01-01T00:00:00Z', 'OPEN', true)).toBe('bad')
    expect(subjectRequestDueClass('2099-01-01T00:00:00Z', 'OPEN', false)).toBe('')
  })

  it('compares an open due instant in UTC when the flag is absent', () => {
    expect(subjectRequestDueClass('2020-01-01T00:00:00Z', 'OPEN')).toBe('bad')
    expect(subjectRequestDueClass('2099-01-01T00:00:00Z', 'OPEN')).toBe('')
    expect(subjectRequestDueClass('2020-01-01T00:00:00Z', 'COMPLETED')).toBe('')
    expect(subjectRequestDueClass('not-a-date', 'OPEN')).toBe('')
  })
})
