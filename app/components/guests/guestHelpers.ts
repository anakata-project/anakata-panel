import type { BookingConsent, Guest, GuestIssueSeverity } from '../../types/api'

export type ConsentRowState = 'present' | 'missing' | 'not_given'

export function guestDisplayName(guest: Pick<Guest, 'first_name' | 'last_name' | 'position'>): string {
  const name = `${guest.first_name} ${guest.last_name}`.trim()

  return name !== '' ? name : `Guest ${guest.position} — name pending`
}

export function issueIcon(severity: GuestIssueSeverity): string {
  return severity === 'error' ? '✕' : '⚠'
}

export function consentRowState(row: Pick<BookingConsent, 'consent' | 'required'>): ConsentRowState {
  if (row.consent !== null) {
    return 'present'
  }

  return row.required ? 'missing' : 'not_given'
}

/**
 * Client-side preview of the guardian block while typing a DOB.
 * The API's `is_minor_now` is authoritative after save.
 */
export function showGuardianBlock(dobIso: string, todayIso: string): boolean {
  const age = calendarAge(dobIso, todayIso)

  return age !== null && age < 18
}

function calendarAge(dobIso: string, onIso: string): number | null {
  if (dobIso === '' || onIso === '') {
    return null
  }

  const dob = parseCalendar(dobIso)
  const on = parseCalendar(onIso)

  if (dob === null || on === null) {
    return null
  }

  let age = on.year - dob.year
  const month = on.month - dob.month

  if (month < 0 || (month === 0 && on.day < dob.day)) {
    age--
  }

  return age
}

function parseCalendar(iso: string): { year: number, month: number, day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)

  if (match === null) {
    return null
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  }
}
