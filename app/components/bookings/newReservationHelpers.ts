import type { BookingFormOptions, BookingQuoteRequest, BookingType } from '../../types/api'

export type ReservationCabinRow = {
  cabinCode: string
  adults: number
  children: number
}

export type CreatedBookingRef = {
  reference: string | null
  display_reference: string | null
}

export function quoteRequestPayload(
  departureId: number | null,
  type: BookingType,
  rows: Array<ReservationCabinRow>,
  backToBack: boolean
): BookingQuoteRequest | null {
  if (departureId === null) {
    return null
  }

  if (type === 'CHARTER') {
    const party = rows[0] ?? { cabinCode: '', adults: 2, children: 0 }

    return {
      departure_id: departureId,
      type,
      back_to_back: backToBack,
      cabins: [{
        adults: party.adults,
        children: party.children
      }]
    }
  }

  if (rows.length === 0 || rows.some(row => row.cabinCode === '')) {
    return null
  }

  return {
    departure_id: departureId,
    type,
    back_to_back: backToBack,
    cabins: rows.map(row => ({
      cabin_code: row.cabinCode,
      adults: row.adults,
      children: row.children
    }))
  }
}

export function showGroupRow(
  charter: boolean,
  cabinCount: number,
  existingGroupId: number | null
): boolean {
  return !charter && (cabinCount >= 2 || existingGroupId !== null)
}

export function showGroupNameField(existingGroupId: number | null): boolean {
  return existingGroupId === null
}

export function showBackToBack(charter: boolean, festive: boolean): boolean {
  return !charter && !festive
}

export function isTradeMain(
  channel: string,
  main: BookingFormOptions['main']
): boolean {
  return main.find(item => item.value === channel)?.trade ?? false
}

export function existingContactSelected(
  email: string,
  selectedEmail: string | null
): boolean {
  if (selectedEmail === null || selectedEmail === '') {
    return false
  }

  return email.trim().toLowerCase() === selectedEmail.trim().toLowerCase()
}

export function createdToast(
  bookings: Array<CreatedBookingRef>,
  groupReference: string | null
): string {
  const refs = bookings.map(booking => booking.display_reference ?? booking.reference ?? '')

  if (bookings.length === 1 && groupReference === null) {
    return `Reservation ${refs[0] ?? ''} created.`
  }

  return `${String(bookings.length)} cabins created under ${groupReference ?? ''} (${refs.join(', ')}). The coordinator receives all communications.`
}

export function charterNoticeText(charter: {
  deposit_pct: number
  deposit_business_days: number
  balance_days: number
  dpng_manifest_days: number
}): string {
  const balancePct = 100 - charter.deposit_pct

  return `CHARTER blocks the entire yacht for the departure. Deposit ${String(charter.deposit_pct)}% within ${String(charter.deposit_business_days)} business days of written confirmation; balance ${String(balancePct)}% at ${String(charter.balance_days)} days; DPNG manifest ${String(charter.dpng_manifest_days)} days pre-departure.`
}

export function depositLineText(
  pct: number,
  depositLabel: string,
  balanceDays: number
): string {
  return `Deposit ${String(pct)}% · ${depositLabel} · balance at T−${String(balanceDays)}`
}
