import type { BookingFormOptions, BookingQuoteRequest, BookingType, MainChannel } from '../../types/api'

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
  backToBack: boolean,
  mainChannel: MainChannel | '' | null = null
): BookingQuoteRequest | null {
  if (departureId === null) {
    return null
  }

  const channel = mainChannel === '' || mainChannel === null
    ? undefined
    : mainChannel

  if (type === 'CHARTER') {
    const party = rows[0] ?? { cabinCode: '', adults: 2, children: 0 }

    return {
      departure_id: departureId,
      type,
      back_to_back: backToBack,
      cabins: [{
        adults: party.adults,
        children: party.children
      }],
      ...(channel === undefined ? {} : { main_channel: channel })
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
    })),
    ...(channel === undefined ? {} : { main_channel: channel })
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

export function commissionWarning(rate: number, cap: number): string | null {
  if (rate <= cap) {
    return null
  }

  return `Commission above ${String(cap)}% is blocked (FIN-005). The booking is created and holds its cabin, but stays ON_HOLD_AGENCY and cannot be confirmed until someone with commissions.override_cap approves it.`
}

export function heldCreatedToast(rate: number, cap: number): string {
  return `Reservation created but HELD: commission ${String(rate)}% exceeds the ${String(cap)}% cap (FIN-005). It cannot reach CONFIRMED until the Commercial Director approves. Alert sent.`
}

export function depositMethodOptions(wireWindowHours: number): Array<{ value: 'card' | 'wire', label: string }> {
  return [
    { value: 'card', label: 'Card — payment link' },
    { value: 'wire', label: `Wire transfer (${String(wireWindowHours)}h · PENDING_PAYMENT)` }
  ]
}

export function agencyOptionLabel(
  agency: { name: string, network: string | null, commission_pct: number },
  cap: number
): string {
  const base = agency.network === null || agency.network === ''
    ? agency.name
    : `${agency.name} — ${agency.network}`

  if (agency.commission_pct <= cap) {
    return base
  }

  return `${base} · >${String(cap)}%`
}

export function tradeCreateFields(
  isTrade: boolean,
  agencyId: number | null,
  commissionPct: number | null
): { agency_id: number, commission_pct?: number } | Record<string, never> {
  if (!isTrade || agencyId === null) {
    return {}
  }

  if (commissionPct === null) {
    return { agency_id: agencyId }
  }

  return { agency_id: agencyId, commission_pct: commissionPct }
}
