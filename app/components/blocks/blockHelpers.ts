import type { BlockClaim, BlockReason } from '../../types/api'

export const ALL_CABIN_CODES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'OWNER'] as const

export const BLOCK_REASONS: Array<BlockReason> = [
  'FAM_TRIP',
  'MAINTENANCE',
  'NEGOTIATION_HOLD',
  'COURTESY'
]

export const MAX_DEPARTURES = 20

export type BlockListStatus = 'active' | 'released' | 'all'

export const STATUS_LABEL_KEYS: Record<BlockListStatus, string> = {
  active: 'blocks.statusActive',
  released: 'blocks.statusReleased',
  all: 'blocks.statusAll'
}

export type StoreInternalBlockBody = {
  reason: BlockReason
  notes?: string | null
  departures: Array<{
    departure_id: number
    cabin_codes: 'ALL' | Array<string>
  }>
}

export function applyFullYacht(checked: boolean): Array<string> {
  return checked ? [...ALL_CABIN_CODES] : []
}

export function isFullYacht(selected: Array<string>): boolean {
  return ALL_CABIN_CODES.every(code => selected.includes(code))
}

export function toggleCabin(selected: Array<string>, code: string): Array<string> {
  if (selected.includes(code)) {
    return selected.filter(item => item !== code)
  }

  return [...selected, code]
}

export function departureOptionLabel(dateLabel: string, itineraryName: string): string {
  return `${dateLabel} · ${itineraryName}`
}

export function blockToOpen<T extends { reference: string }>(
  open: string | Array<string> | null | undefined,
  blocks: Array<T>
): T | null {
  const reference = Array.isArray(open) ? open[0] : open

  if (typeof reference !== 'string' || reference === '') {
    return null
  }

  return blocks.find(block => block.reference === reference) ?? null
}

export function reasonLabelKey(reason: BlockReason): string {
  return `blocks.reasons.${reason}`
}

export function cabinsLabel(codes: Array<string>): string {
  const unique = Array.from(new Set(codes))

  if (ALL_CABIN_CODES.every(code => unique.includes(code))) {
    return 'Full yacht'
  }

  const suites: Array<number> = []
  let owner = false

  for (const code of unique) {
    if (code === 'OWNER') {
      owner = true
      continue
    }

    const match = /^S(\d+)$/.exec(code)

    if (match?.[1] !== undefined) {
      suites.push(Number(match[1]))
    }
  }

  suites.sort((left, right) => left - right)

  const parts = suiteRanges(suites)

  if (owner) {
    parts.push('Owner\'s Suite')
  }

  return parts.join(', ')
}

export function scopeLines(
  claims: Array<Pick<BlockClaim, 'cabin' | 'departure'>>,
  formatDate: (iso: string) => string
): Array<string> {
  const groups = new Map<number, {
    date: string
    yacht: string
    codes: Array<string>
  }>()

  for (const claim of claims) {
    const existing = groups.get(claim.departure.id)

    if (existing === undefined) {
      groups.set(claim.departure.id, {
        date: claim.departure.date,
        yacht: claim.departure.yacht.code,
        codes: [claim.cabin.code]
      })
      continue
    }

    existing.codes.push(claim.cabin.code)
  }

  return Array.from(groups.values())
    .sort((left, right) => {
      if (left.date !== right.date) {
        return left.date < right.date ? -1 : 1
      }

      return left.yacht.localeCompare(right.yacht)
    })
    .map(group => `${formatDate(group.date)} · ${group.yacht} · ${cabinsLabel(group.codes)}`)
}

export function futureDepartures<T extends { date: string }>(
  departures: Array<T>,
  today: string
): Array<T> {
  return departures.filter(departure => departure.date >= today)
}

export function cabinCodesPayload(selected: Array<string>): 'ALL' | Array<string> {
  return isFullYacht(selected) ? 'ALL' : selected
}

function suiteRanges(numbers: Array<number>): Array<string> {
  const ranges: Array<string> = []
  let start: number | null = null
  let end: number | null = null

  for (const number of numbers) {
    if (start === null || end === null) {
      start = end = number
      continue
    }

    if (number === end + 1) {
      end = number
      continue
    }

    ranges.push(rangeLabel(start, end))
    start = end = number
  }

  if (start !== null && end !== null) {
    ranges.push(rangeLabel(start, end))
  }

  return ranges
}

function rangeLabel(start: number, end: number): string {
  const from = `Suite ${String(start).padStart(2, '0')}`

  if (start === end) {
    return from
  }

  return `${from}–${String(end).padStart(2, '0')}`
}
