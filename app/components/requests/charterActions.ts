import type { CharterEnquiryStatus } from '../../types/api'

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
