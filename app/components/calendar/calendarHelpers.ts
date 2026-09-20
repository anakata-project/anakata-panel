import type {
  BlockReason,
  CabinState,
  CalendarCell,
  CalendarDeparture,
  CalendarRow,
  ClaimSummary
} from '../../types/api'

export type CellPresentation = {
  cellClass: string
  deckClass: string
  label: string
  deckStatus: string
  title: string
  href: string | null
}

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

export function mapCabinCell(input: {
  state: CabinState | null
  claim: ClaimSummary | null
  cabinLabel: string
  dateLabel: string
  yachtName: string
}): CellPresentation {
  if (input.state === null) {
    return {
      cellClass: 'c-none',
      deckClass: '',
      label: '—',
      deckStatus: '',
      title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'No sailing'),
      href: null
    }
  }

  if (input.state === 'FREE') {
    return {
      cellClass: 'c-av',
      deckClass: '',
      label: '·',
      deckStatus: 'Available',
      title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'Available'),
      href: null
    }
  }

  if (input.state === 'BLOCKED') {
    const holder = input.claim?.holder
    const detail = holder?.detail ?? null
    // holder.type is an untyped morph alias in the spec; the generated
    // oneOf on detail is not discriminated by it. Narrow the union by shape.
    const blockDetail = detail !== null && 'reason' in detail ? detail : null
    const reason = blockDetail?.reason ?? null
    const reasonLabel = blockDetail?.reason_label ?? 'Blocked'
    const reference = input.claim?.holder.reference ?? null
    const short = reason !== null ? BLOCK_SHORT[reason] : 'BLK'
    const status = reference !== null && reference !== ''
      ? `Blocked: ${reasonLabel} (${reference})`
      : `Blocked: ${reasonLabel}`

    return {
      cellClass: 'c-block',
      deckClass: 's-block',
      label: short,
      deckStatus: `Blocked · ${reasonLabel}`,
      title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, status),
      href: reference !== null && reference !== ''
        ? `/rms/operations/blocks?open=${encodeURIComponent(reference)}`
        : null
    }
  }

  if (input.state === 'HELD') {
    const holdType = input.claim?.hold_type
    const isRequest = holdType === 'REQUEST'
    const isAgency = holdType === 'AGENCY'

    return {
      cellClass: isRequest ? 'c-req' : 'c-hold',
      deckClass: 's-hold',
      label: isRequest ? 'REQ' : isAgency ? 'AGCY' : 'HOLD',
      deckStatus: 'On hold · …',
      title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'On hold'),
      href: null
    }
  }

  // TODO(Sprint 4): booking sub-states (c-conf, c-full, c-dep, c-charter) and own-records lock
  return {
    cellClass: 'c-conf',
    deckClass: 's-conf',
    label: 'SOLD',
    deckStatus: 'Sold',
    title: contextTitle(input.cabinLabel, input.dateLabel, input.yachtName, 'Sold'),
    href: null
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

export function cellAt(row: CalendarRow, column: DateColumn): CalendarCell | null {
  const departure = column.departuresByYachtId[row.yacht.id]

  if (departure === undefined) {
    return null
  }

  return row.cells[String(departure.id)] ?? null
}

export function departureDateOptions(departures: Array<CalendarDeparture>): Array<DepartureDateOption> {
  return groupColumnsByDate(departures).map(column => ({
    date: column.date,
    festive: column.festive
  }))
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
