import type {
  BlockReason,
  CabinState,
  CalendarCell,
  CalendarDeparture,
  CalendarRow,
  ClaimHolder,
  ClaimSummary
} from '../../types/api'

export type CellAction
  = | { type: 'none' }
    | { type: 'block', href: string }
    | { type: 'open', bookingId: number }
    | { type: 'free', departureId: number, cabinCode: string }

export type CellPresentation = {
  cellClass: string
  deckClass: string
  label: string
  deckStatus: string
  title: string
  href: string | null
  locked: boolean
  action: CellAction
}

type BookingClaimDetail = Extract<ClaimHolder['detail'], { status: string }>

export type DateColumn = {
  date: string
  festive: boolean
  departuresByYachtId: Record<number, CalendarDeparture>
}

export type DepartureDateOption = {
  date: string
  festive: boolean
}

export type YachtSection = {
  yacht: CalendarRow['yacht']
  rows: Array<CalendarRow>
}

const BLOCK_SHORT: Record<BlockReason, string> = {
  FAM_TRIP: 'FAM',
  MAINTENANCE: 'MAINT',
  NEGOTIATION_HOLD: 'NEG',
  COURTESY: 'COURT'
}

function contextTitle(cabinLabel: string, dateLabel: string, yachtName: string, status: string): string {
  return `${cabinLabel} · ${dateLabel} · ${yachtName} — ${status}`
}

export function bookingTooltip(
  cabinLabel: string,
  dateLabel: string,
  yachtName: string,
  reference: string,
  status: string,
  ownerName: string
): string {
  return `${cabinLabel} · ${dateLabel} · ${yachtName} — ${reference} · ${status} · ${ownerName}`
}

export function freeCellPrompt(cabinLabel: string, dateLabel: string, yachtName: string): string {
  return `Available — ${cabinLabel} on ${dateLabel} · ${yachtName}. Create a manual reservation here?`
}

/**
 * Same rule as App\Policies\Concerns\ChecksOwnRecords::ownsOrMayActOnAny.
 * holder.detail has no can_act. Follow-up: overlay can_act on the calendar resource.
 */
export function canActOnBooking(
  ownerId: number,
  currentUserId: number | null,
  hasActOnAny: boolean
): boolean {
  if (hasActOnAny) {
    return true
  }

  return currentUserId !== null && ownerId === currentUserId
}

export function bookingOwnerId(claim: ClaimSummary | null): number | null {
  const detail = bookingDetail(claim)

  return detail?.owner_id ?? null
}

function bookingDetail(claim: ClaimSummary | null): BookingClaimDetail | null {
  const detail = claim?.holder.detail ?? null

  if (detail !== null && 'status' in detail) {
    return detail
  }

  return null
}

function statusTitle(status: string): string {
  const lower = status.replaceAll('_', ' ').toLowerCase()

  return lower.replace(/^[a-z]/, letter => letter.toUpperCase())
}

function lastFour(reference: string | null): string {
  if (reference === null || reference === '') {
    return 'SOLD'
  }

  return reference.slice(-4)
}

function lockClass(base: string, locked: boolean): string {
  return locked ? `${base} lock` : base
}

function noneAction(): CellAction {
  return { type: 'none' }
}

function presentNone(input: MapCabinCellInput): CellPresentation {
  return {
    cellClass: 'c-none',
    deckClass: '',
    label: '—',
    deckStatus: '',
    title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'No sailing'),
    href: null,
    locked: false,
    action: noneAction()
  }
}

function presentFree(input: MapCabinCellInput, expiredReference: string | null = null): CellPresentation {
  const canCreate = input.canCreate === true
  const departureId = input.departureId
  const cabinCode = input.cabinCode
  const action: CellAction = canCreate && departureId !== null && departureId !== undefined && cabinCode !== undefined && cabinCode !== ''
    ? { type: 'free', departureId, cabinCode }
    : noneAction()

  const title = expiredReference !== null
    ? contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, `Available (${expiredReference} hold expired)`)
    : canCreate
      ? freeCellPrompt(input.cabinLabel, input.dateLabel, input.yachtName)
      : contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'Available')

  return {
    cellClass: 'c-av',
    deckClass: '',
    label: '·',
    deckStatus: 'Available',
    title,
    href: null,
    locked: false,
    action
  }
}

export type MapCabinCellInput = {
  state: CabinState | null
  claim: ClaimSummary | null
  cabinLabel: string
  dateLabel: string
  yachtName: string
  canAct?: boolean | null
  canCreate?: boolean
  departureId?: number | null
  cabinCode?: string
}

export function mapCabinCell(input: MapCabinCellInput): CellPresentation {
  if (input.state === null) {
    return presentNone(input)
  }

  const detail = bookingDetail(input.claim)

  if (detail !== null && detail.hold_expired) {
    return presentFree(input, detail.display_reference ?? input.claim?.holder.reference ?? null)
  }

  if (input.state === 'FREE') {
    return presentFree(input)
  }

  if (input.state === 'BLOCKED') {
    const holder = input.claim?.holder
    const blockDetail = holder?.detail !== null && holder?.detail !== undefined && 'reason' in holder.detail
      ? holder.detail
      : null
    const reason = blockDetail?.reason ?? null
    const reasonLabel = blockDetail?.reason_label ?? 'Blocked'
    const reference = input.claim?.holder.reference ?? null
    const short = reason !== null ? BLOCK_SHORT[reason] : 'BLK'
    const status = reference !== null && reference !== ''
      ? `Blocked: ${reasonLabel} (${reference})`
      : `Blocked: ${reasonLabel}`
    const href = reference !== null && reference !== ''
      ? `/rms/operations/blocks?open=${encodeURIComponent(reference)}`
      : null

    return {
      cellClass: 'c-block',
      deckClass: 's-block',
      label: short,
      deckStatus: `Blocked · ${reasonLabel}`,
      title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, status),
      href,
      locked: false,
      action: href !== null ? { type: 'block', href } : noneAction()
    }
  }

  if (input.state === 'HELD') {
    return presentHeld(input, detail)
  }

  return presentSold(input, detail)
}

function presentHeld(input: MapCabinCellInput, detail: BookingClaimDetail | null): CellPresentation {
  const holdType = input.claim?.hold_type
  const isRequest = holdType === 'REQUEST'
  const isAgency = holdType === 'AGENCY'
  const locked = isRequest && input.canAct === false
  const lockPrefix = locked ? '🔒 ' : ''
  const reference = detail?.display_reference ?? input.claim?.holder.reference ?? null
  const party = detail?.party_label ?? '…'
  const bookingId = input.claim?.holder.id

  if (isRequest && bookingId !== undefined) {
    return {
      cellClass: lockClass('c-req', locked),
      deckClass: 's-hold',
      label: 'REQ',
      deckStatus: `${lockPrefix}Requested · ${party}`,
      title: detail !== null && reference !== null
        ? bookingTooltip(input.cabinLabel, input.dateLabel, input.yachtName, reference, 'Requested', detail.owner_name)
        : contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'On hold'),
      href: null,
      locked,
      action: { type: 'open', bookingId }
    }
  }

  return {
    cellClass: isRequest ? 'c-req' : 'c-hold',
    deckClass: 's-hold',
    label: isRequest ? 'REQ' : isAgency ? 'AGCY' : 'HOLD',
    deckStatus: 'On hold · …',
    title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'On hold'),
    href: null,
    locked: false,
    action: noneAction()
  }
}

function presentSold(input: MapCabinCellInput, detail: BookingClaimDetail | null): CellPresentation {
  const locked = input.canAct === false
  const lockPrefix = locked ? '🔒 ' : ''
  const bookingId = input.claim?.holder.id
  const action: CellAction = bookingId !== undefined
    ? { type: 'open', bookingId }
    : noneAction()
  const reference = detail?.display_reference ?? input.claim?.holder.reference ?? null
  const party = detail?.party_label ?? ''
  const segment = detail?.segment ?? ''
  const owner = detail?.owner_name ?? ''
  const refLabel = reference ?? 'booking'

  if (detail?.type === 'CHARTER') {
    return {
      cellClass: lockClass('c-charter', locked),
      deckClass: 's-conf',
      label: 'CHARTER',
      deckStatus: `${lockPrefix}Charter · ${party}`,
      title: bookingTooltip(input.cabinLabel, input.dateLabel, input.yachtName, refLabel, statusTitle(detail.status), owner),
      href: null,
      locked,
      action
    }
  }

  if (detail?.status === 'PENDING_PAYMENT') {
    return {
      cellClass: lockClass('c-dep', locked),
      deckClass: 's-dep',
      label: 'PEND',
      deckStatus: `${lockPrefix}Pending payment · ${party}`,
      title: bookingTooltip(input.cabinLabel, input.dateLabel, input.yachtName, refLabel, 'Pending payment', owner),
      href: null,
      locked,
      action
    }
  }

  if (detail?.status === 'FULLY_PAID' || detail?.status === 'ON_BOARD') {
    return {
      cellClass: lockClass('c-full', locked),
      deckClass: 's-conf',
      label: lastFour(reference),
      deckStatus: `${lockPrefix}Fully paid · ${party} · ${segment}`,
      title: bookingTooltip(
        input.cabinLabel,
        input.dateLabel,
        input.yachtName,
        refLabel,
        detail.status === 'ON_BOARD' ? 'On board' : 'Fully paid',
        owner
      ),
      href: null,
      locked,
      action
    }
  }

  if (detail?.status === 'COMPLETED') {
    return {
      cellClass: lockClass('c-conf', locked),
      deckClass: 's-conf',
      label: lastFour(reference),
      deckStatus: `${lockPrefix}Completed · ${party}`,
      title: bookingTooltip(input.cabinLabel, input.dateLabel, input.yachtName, refLabel, 'Completed', owner),
      href: null,
      locked,
      action
    }
  }

  return {
    cellClass: lockClass('c-conf', locked),
    deckClass: 's-conf',
    label: lastFour(reference),
    deckStatus: `${lockPrefix}Confirmed · ${party} · ${segment}`,
    title: detail !== null
      ? bookingTooltip(input.cabinLabel, input.dateLabel, input.yachtName, refLabel, statusTitle(detail.status), owner)
      : contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'Sold'),
    href: null,
    locked,
    action
  }
}

export function groupColumnsByDate(departures: Array<CalendarDeparture>): Array<DateColumn> {
  const byDate = new Map<string, Array<CalendarDeparture>>()

  for (const departure of departures) {
    const existing = byDate.get(departure.date)

    if (existing === undefined) {
      byDate.set(departure.date, [departure])
      continue
    }

    existing.push(departure)
  }

  return Array.from(byDate.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, group]) => {
      const departuresByYachtId: Record<number, CalendarDeparture> = {}

      for (const departure of group) {
        departuresByYachtId[departure.yacht.id] = departure
      }

      return {
        date,
        festive: group.some(departure => departure.festive),
        departuresByYachtId
      }
    })
}

function yachtDeparturesInRange(row: CalendarRow, columns: Array<DateColumn>): Array<CalendarDeparture> {
  return columns
    .map(item => item.departuresByYachtId[row.yacht.id])
    .filter((item): item is CalendarDeparture => item !== undefined)
}

function cellsAreListIndexed(row: CalendarRow, count: number): boolean {
  if (count === 0) {
    return false
  }

  for (let i = 0; i < count; i++) {
    if (row.cells[String(i)] === undefined) {
      return false
    }
  }

  return true
}

export function cellAt(row: CalendarRow, column: DateColumn, columns: Array<DateColumn> = []): CalendarCell | null {
  const departure = column.departuresByYachtId[row.yacht.id]

  if (departure === undefined) {
    return null
  }

  const yachtDepartures = yachtDeparturesInRange(row, columns)
  const index = yachtDepartures.findIndex(item => item.id === departure.id)
  const byIndex = index >= 0 ? row.cells[String(index)] : undefined
  const byId = row.cells[String(departure.id)]

  // Calendar JSON reindexes departure-id keys to 0..n. Prefer that list when
  // complete — otherwise departure id 1 collides with cells["1"].
  if (cellsAreListIndexed(row, yachtDepartures.length) && byIndex !== undefined) {
    return byIndex
  }

  return byId ?? byIndex ?? null
}

export function departureDateOptions(departures: Array<CalendarDeparture>): Array<DepartureDateOption> {
  return groupColumnsByDate(departures).map(column => ({
    date: column.date,
    festive: column.festive
  }))
}

export function departureSelectItems(
  options: Array<DepartureDateOption>,
  labelFor: (option: DepartureDateOption) => string
): Array<{ label: string, value: string }> {
  return options.flatMap((option) => {
    if (option.date === '') {
      return []
    }

    return [{ label: labelFor(option), value: option.date }]
  })
}

export function retainSelectedDate(selected: string | null, dates: Array<string>): string | null {
  if (selected !== null && dates.includes(selected)) {
    return selected
  }

  return dates[0] ?? null
}

export function yachtSections(rows: Array<CalendarRow>): Array<YachtSection> {
  const sections: Array<YachtSection> = []

  for (const row of rows) {
    const last = sections[sections.length - 1]

    if (last !== undefined && last.yacht.id === row.yacht.id) {
      last.rows.push(row)
      continue
    }

    sections.push({ yacht: row.yacht, rows: [row] })
  }

  return sections
}

export function deckCabinOrder(rows: Array<CalendarRow>): Array<CalendarRow> {
  return [...rows].sort((left, right) => {
    const leftOwner = left.cabin.code === 'OWNER' ? 0 : 1
    const rightOwner = right.cabin.code === 'OWNER' ? 0 : 1

    if (leftOwner !== rightOwner) {
      return leftOwner - rightOwner
    }

    return left.cabin.sort - right.cabin.sort
  })
}

export function deckCabinName(label: string): string {
  return label.toUpperCase()
}

export type LegendKey
  = | 'available'
    | 'hold'
    | 'confirmed'
    | 'full'
    | 'pending'
    | 'requested'
    | 'charter'
    | 'block'
    | 'locked'

export const LEGEND_KEYS: ReadonlyArray<LegendKey> = [
  'available',
  'hold',
  'confirmed',
  'full',
  'pending',
  'requested',
  'charter',
  'block',
  'locked'
]

const LEGEND_BY_CLASS: Record<string, LegendKey> = {
  'c-av': 'available',
  'c-hold': 'hold',
  'c-conf': 'confirmed',
  'c-full': 'full',
  'c-dep': 'pending',
  'c-req': 'requested',
  'c-charter': 'charter',
  'c-block': 'block'
}

const SOLD_KEYS: ReadonlyArray<LegendKey> = ['confirmed', 'full', 'pending', 'charter']

export type Occupancy = {
  sold: number
  total: number
}

export type CalendarRowView = {
  row: CalendarRow
  cells: Array<CellPresentation>
  open: number
}

export type CalendarSectionView = {
  yacht: CalendarRow['yacht']
  rows: Array<CalendarRowView>
  occupancy: Array<Occupancy>
  soldPercent: number
}

export type CalendarSummary = {
  suiteDepartures: number
  sold: number
  available: number
  hold: number
  soldPercent: number
  legend: Record<LegendKey, number>
}

export type CalendarView = {
  sections: Array<CalendarSectionView>
  summary: CalendarSummary
}

/** The legend categories a cell belongs to. Locked cells also count as "not yours". */
export function legendKeysOf(view: CellPresentation): Array<LegendKey> {
  const keys: Array<LegendKey> = []
  const base = LEGEND_BY_CLASS[view.cellClass.split(' ')[0] ?? '']

  if (base !== undefined) {
    keys.push(base)
  }

  if (view.locked) {
    keys.push('locked')
  }

  return keys
}

export function percentOf(part: number, total: number): number {
  return total === 0 ? 0 : Math.round(part * 100 / total)
}

function emptyLegend(): Record<LegendKey, number> {
  return {
    available: 0,
    hold: 0,
    confirmed: 0,
    full: 0,
    pending: 0,
    requested: 0,
    charter: 0,
    block: 0,
    locked: 0
  }
}

/**
 * Presentation-only roll-up of what the API already sent for the visible
 * range: legend counts, KPI tiles and the per-departure occupancy bars.
 * Nothing here decides availability or price.
 */
export function buildCalendarView(
  sections: Array<YachtSection>,
  columns: Array<DateColumn>,
  present: (row: CalendarRow, column: DateColumn) => CellPresentation
): CalendarView {
  const legend = emptyLegend()
  let suiteDepartures = 0
  let sold = 0

  const views = sections.map((section): CalendarSectionView => {
    const occupancy = columns.map((): Occupancy => ({ sold: 0, total: 0 }))

    const rows = section.rows.map((row): CalendarRowView => {
      let open = 0

      const cells = columns.map((column, index) => {
        const view = present(row, column)
        const keys = legendKeysOf(view)
        const slot = occupancy[index]

        for (const key of keys) {
          legend[key] += 1
        }

        if (view.cellClass !== 'c-none') {
          suiteDepartures += 1

          if (slot !== undefined) {
            slot.total += 1
          }
        }

        if (keys.includes('available')) {
          open += 1
        }

        if (keys.some(key => SOLD_KEYS.includes(key))) {
          sold += 1

          if (slot !== undefined) {
            slot.sold += 1
          }
        }

        return view
      })

      return { row, cells, open }
    })

    const soldTotal = occupancy.reduce((sum, item) => sum + item.sold, 0)
    const total = occupancy.reduce((sum, item) => sum + item.total, 0)

    return {
      yacht: section.yacht,
      rows,
      occupancy,
      soldPercent: percentOf(soldTotal, total)
    }
  })

  return {
    sections: views,
    summary: {
      suiteDepartures,
      sold,
      available: legend.available,
      hold: legend.hold,
      soldPercent: percentOf(sold, suiteDepartures),
      legend
    }
  }
}

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** `2026-10-18` → `Sun`. Date-only, so no timezone shift. */
export function columnWeekday(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)

  if (year === undefined || month === undefined || day === undefined) {
    return ''
  }

  return SHORT_WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ?? ''
}

/** `2026-10-18` → `18 Oct`. */
export function columnDayMonth(iso: string): string {
  const [, month, day] = iso.split('-').map(Number)

  if (month === undefined || day === undefined) {
    return iso
  }

  return `${String(day)} ${SHORT_MONTHS[month - 1] ?? ''}`
}
