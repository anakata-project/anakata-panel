import type {
  AvailabilityCounts,
  CabinAvailability,
  CabinState,
  Departure,
  DepartureListItem,
  DepartureStatus,
  EngineLabelTone,
  Itinerary,
  Yacht
} from '../../types/api'

export type SeasonPattern = 'ALT' | 'WEST' | 'NORTH'

export type SeasonCreateStatus = 'CLOSED' | 'ON_SALE'

export type MutationOutcome = {
  closeDrawer: boolean
  adoptCreated: boolean
}

export type InvBarWidths = {
  sold: string
  held: string
  blocked: string
}

export type DepartureDraft = {
  id: number | null
  reference: string
  date: string
  yacht_id: number
  itinerary_id: number
  status: DepartureStatus
  urgency_threshold: number
  waitlist_enabled: boolean
  public_note: string
  festive: boolean
}

export const DEPARTURE_STATUSES: Array<DepartureStatus> = [
  'ON_SALE',
  'CLOSED',
  'HIDDEN',
  'CHARTER'
]

export function statusLabelKey(status: DepartureStatus): string {
  const keys: Record<DepartureStatus, string> = {
    ON_SALE: 'departures.statusOnSale',
    CLOSED: 'departures.statusClosed',
    HIDDEN: 'departures.statusHidden',
    CHARTER: 'departures.statusCharter'
  }

  return keys[status]
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function parseUtc(iso: string): Date {
  const match = ISO_DATE.exec(iso)

  if (!match) {
    throw new Error(`Invalid ISO date: ${iso}`)
  }

  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function toIso(date: Date): string {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function widthOf(count: number): string {
  return `${((count / 9) * 100).toFixed(1)}%`
}

export function invBarWidths(counts: Pick<AvailabilityCounts, 'sold' | 'held' | 'blocked'>): InvBarWidths {
  return {
    sold: widthOf(counts.sold),
    held: widthOf(counts.held),
    blocked: widthOf(counts.blocked)
  }
}

export function labelToneClass(tone: EngineLabelTone): string {
  const classes: Record<EngineLabelTone, string> = {
    conf: 'p-conf',
    pend: 'p-pend',
    wait: 'p-wait',
    hold: 'p-hold',
    canc: 'p-canc',
    comp: 'p-comp'
  }

  return classes[tone]
}

export function nextSundayAfter(iso: string): string {
  const date = parseUtc(iso)
  const add = date.getUTCDay() === 0 ? 7 : 7 - date.getUTCDay()
  date.setUTCDate(date.getUTCDate() + add)

  return toIso(date)
}

export function nextSundayOnOrAfter(iso: string): string {
  const date = parseUtc(iso)

  if (date.getUTCDay() === 0) {
    return iso
  }

  date.setUTCDate(date.getUTCDate() + (7 - date.getUTCDay()))

  return toIso(date)
}

export function addWeeks(iso: string, weeks: number): string {
  const date = parseUtc(iso)
  date.setUTCDate(date.getUTCDate() + (weeks * 7))

  return toIso(date)
}

export function seasonDefaults(latestDate: string | null, today: string): { from: string, to: string } {
  const from = latestDate === null ? nextSundayOnOrAfter(today) : nextSundayAfter(latestDate)

  return {
    from,
    to: addWeeks(from, 12)
  }
}

export function afterMutation(wasNew: boolean, warnings: Array<string>): MutationOutcome {
  if (warnings.length === 0) {
    return { closeDrawer: true, adoptCreated: false }
  }

  return { closeDrawer: false, adoptCreated: wasNew }
}

export function revertStatus<T>(previous: T, next: T, ok: boolean): T {
  return ok ? next : previous
}

export function cabinChipLabel(cabin: CabinAvailability['cabin']): string {
  if (cabin.category === 'OWNER') {
    return 'OWNER\'S'
  }

  return cabin.label.toUpperCase()
}

export function cabinChipClass(state: CabinState): string {
  if (state === 'SOLD') {
    return 'cc-sold'
  }

  if (state === 'HELD') {
    return 'cc-held'
  }

  if (state === 'BLOCKED') {
    return 'cc-block'
  }

  return 'cc-free'
}

export function itineraryWarningKey(status: string): 'departures.itinDraft' | 'departures.itinHidden' | null {
  if (status === 'PUBLISHED') {
    return null
  }

  return status === 'HIDDEN' ? 'departures.itinHidden' : 'departures.itinDraft'
}

export function dateAndYachtLockCount(counts: AvailabilityCounts): number {
  return counts.sold + counts.held
}

export function draftFromNew(yachts: Array<Yacht>, itineraries: Array<Itinerary>): DepartureDraft | null {
  const yacht = yachts.find(item => item.code === 'ANAMARA') ?? yachts[0]
  const itinerary = itineraries.find(item => item.code === 'WEST') ?? itineraries[0]

  if (!yacht || !itinerary) {
    return null
  }

  return {
    id: null,
    reference: '',
    date: '',
    yacht_id: yacht.id,
    itinerary_id: itinerary.id,
    status: 'CLOSED',
    urgency_threshold: 3,
    waitlist_enabled: true,
    public_note: '',
    festive: false
  }
}

export function draftFromDeparture(departure: Departure | DepartureListItem): DepartureDraft {
  return {
    id: departure.id,
    reference: departure.reference,
    date: departure.date,
    yacht_id: departure.yacht_id,
    itinerary_id: departure.itinerary_id,
    status: departure.status,
    urgency_threshold: departure.urgency_threshold,
    waitlist_enabled: departure.waitlist_enabled,
    public_note: departure.public_note ?? '',
    festive: departure.festive
  }
}

export function adoptCreated(draft: DepartureDraft, created: Departure): DepartureDraft {
  return {
    ...draft,
    id: created.id,
    reference: created.reference,
    date: created.date,
    yacht_id: created.yacht_id,
    itinerary_id: created.itinerary_id,
    status: created.status,
    urgency_threshold: created.urgency_threshold,
    waitlist_enabled: created.waitlist_enabled,
    public_note: created.public_note ?? '',
    festive: created.festive
  }
}

export function toApiBody(draft: DepartureDraft): Record<string, unknown> {
  const threshold = Math.max(0, Math.min(9, draft.urgency_threshold))

  return {
    date: draft.date,
    yacht_id: draft.yacht_id,
    itinerary_id: draft.itinerary_id,
    status: draft.status,
    urgency_threshold: threshold,
    waitlist_enabled: draft.waitlist_enabled,
    public_note: draft.public_note.trim() === '' ? null : draft.public_note,
    festive: draft.festive
  }
}

export function editorSnapshot(draft: DepartureDraft): string {
  return JSON.stringify(toApiBody(draft))
}

export function sortedItineraries(itineraries: Array<Itinerary>): Array<Itinerary> {
  return [...itineraries].sort((left, right) => left.sort_order - right.sort_order)
}
