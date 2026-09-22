import { describe, expect, it } from 'vitest'
import { alertBadgeClass, alertSeverityClass, seesAnyAlert } from '../../app/components/alerts/alertHelpers'

describe('alertHelpers', () => {
  it('maps severity onto the prototype pills', () => {
    expect(alertSeverityClass('CRITICAL')).toBe('p-canc')
    expect(alertSeverityClass('WARN')).toBe('p-hold')
    expect(alertSeverityClass('INFO')).toBe('p-pend')
    expect(alertSeverityClass('OTHER')).toBe('')
  })

  it('colours the badge coral for any critical count and amber for warn', () => {
    expect(alertBadgeClass({ CRITICAL: 1, WARN: 4 })).toBe('p-canc')
    expect(alertBadgeClass({ CRITICAL: 0, WARN: 2 })).toBe('p-hold')
    expect(alertBadgeClass({ CRITICAL: 0, WARN: 0 })).toBe('')
  })

  it('hides the bell when the user holds none of the registry audiences', () => {
    const kinds = [
      { audience: [{ value: 'bookings.overdue_decision', label: 'Overdue' }] },
      { audience: [{ value: 'guests.view_sensitive', label: 'Sensitive' }] }
    ]

    expect(seesAnyAlert(kinds, permission => permission === 'guests.view_sensitive')).toBe(true)
    expect(seesAnyAlert(kinds, () => false)).toBe(false)
    expect(seesAnyAlert([], () => true)).toBe(false)
  })
})
