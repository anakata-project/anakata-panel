import { describe, expect, it } from 'vitest'
import {
  consentRowState,
  guestDisplayName,
  issueIcon,
  showGuardianBlock
} from '../../app/components/guests/guestHelpers'
import type { BookingConsent, Guest } from '../../app/types/api'

function guest(partial: Partial<Guest> & Pick<Guest, 'position'>): Pick<Guest, 'first_name' | 'last_name' | 'position'> {
  return {
    first_name: partial.first_name ?? '',
    last_name: partial.last_name ?? '',
    position: partial.position
  }
}

describe('guestHelpers', () => {
  it('uses the stored position for a pending name, including after a gap', () => {
    expect(guestDisplayName(guest({ first_name: 'Julia', last_name: 'Brandt', position: 2 })))
      .toBe('Julia Brandt')
    expect(guestDisplayName(guest({ position: 1 }))).toBe('Guest 1 — name pending')
    expect(guestDisplayName(guest({ position: 3 }))).toBe('Guest 3 — name pending')
  })

  it('maps issue severity to the prototype icons', () => {
    expect(issueIcon('error')).toBe('✕')
    expect(issueIcon('warning')).toBe('⚠')
  })

  it('classifies consent rows; outdated still counts as present', () => {
    const present = {
      consent: { id: 1 },
      required: true
    } as Pick<BookingConsent, 'consent' | 'required'>

    expect(consentRowState(present)).toBe('present')
    expect(consentRowState({ consent: null, required: true })).toBe('missing')
    expect(consentRowState({ consent: null, required: false })).toBe('not_given')
  })

  it('previews the guardian block from calendar age today, not the list index', () => {
    expect(showGuardianBlock('', '2026-09-21')).toBe(false)
    expect(showGuardianBlock('2015-03-02', '2026-09-21')).toBe(true)
    expect(showGuardianBlock('2008-09-21', '2026-09-21')).toBe(false)
    expect(showGuardianBlock('2008-09-22', '2026-09-21')).toBe(true)
  })
})
