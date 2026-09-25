import type { CharterEnquiryStatus } from '../../types/api'

/** Reka UI SelectItem throws if value is "". */
export const CHARTER_STATUS_ALL = 'all'

export const CHARTER_STATUSES: Array<CharterEnquiryStatus> = [
  'NEW',
  'CONTACTED',
  'QUOTED',
  'ACCEPTED',
  'DECLINED',
  'CLOSED'
]

export function charterStatusSelectItems(
  allLabel: string,
  labelFor: (status: CharterEnquiryStatus) => string
): Array<{ label: string, value: string }> {
  return [
    { label: allLabel, value: CHARTER_STATUS_ALL },
    ...CHARTER_STATUSES.map(status => ({ label: labelFor(status), value: status }))
  ]
}

/**
 * Mirrors UpdateCharterEnquiryStatus. Issue is allowed while a proposal can still be created.
 */
export type CharterActionFlags = {
  contacted: boolean
  issue: boolean
  decline: boolean
  close: boolean
}

export function charterActions(status: CharterEnquiryStatus, hasBooking: boolean): CharterActionFlags {
  return {
    contacted: status === 'NEW',
    issue: status === 'NEW' || status === 'CONTACTED' || status === 'QUOTED',
    decline: status === 'QUOTED',
    close: status === 'NEW'
      || status === 'CONTACTED'
      || status === 'QUOTED'
      || status === 'DECLINED'
      || (status === 'ACCEPTED' && !hasBooking)
  }
}
