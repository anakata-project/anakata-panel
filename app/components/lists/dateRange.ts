export type DateRangePreset = 'all' | 'last30' | 'last90' | 'next30' | 'next90' | 'next12' | 'winter' | 'custom' | `y${number}`

export type DateRangeYacht = {
  id: number
  name: string
}

const QUICK_PRESETS: Array<DateRangePreset> = ['next30', 'next90', 'winter']

const SHORT_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export type DateRangeBounds = {
  from: string | null
  to: string | null
}

export type DateRangeYear = {
  key: `y${number}`
  year: number
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

export function addDays(iso: string, days: number): string {
  const date = parseUtc(iso)
  date.setUTCDate(date.getUTCDate() + days)

  return toIso(date)
}

export function addMonths(iso: string, months: number): string {
  const date = parseUtc(iso)
  date.setUTCMonth(date.getUTCMonth() + months)

  return toIso(date)
}

export function calendarYear(today: string): number {
  return Number(today.slice(0, 4))
}

export function yearPresets(today: string): Array<DateRangeYear> {
  const year = calendarYear(today)

  return [0, 1, 2].map((offset) => {
    const next = year + offset

    return {
      key: `y${next}` as const,
      year: next
    }
  })
}

export function resolveDateRange(preset: DateRangePreset, today: string): DateRangeBounds {
  if (preset === 'all' || preset === 'custom') {
    return { from: null, to: null }
  }

  if (preset === 'last30') {
    return { from: addDays(today, -30), to: today }
  }

  if (preset === 'last90') {
    return { from: addDays(today, -90), to: today }
  }

  if (preset === 'next30') {
    return { from: today, to: addDays(today, 30) }
  }

  if (preset === 'next90') {
    return { from: today, to: addDays(today, 90) }
  }

  if (preset === 'winter') {
    return winterSeason(today)
  }

  if (preset === 'next12') {
    const date = parseUtc(today)
    date.setUTCFullYear(date.getUTCFullYear() + 1)

    return { from: today, to: toIso(date) }
  }

  if (preset.startsWith('y')) {
    const year = Number(preset.slice(1))

    return { from: `${year}-01-01`, to: `${year}-12-31` }
  }

  return { from: null, to: null }
}

export function normalizeRange(from: string | null, to: string | null): DateRangeBounds {
  if (from !== null && to !== null && from > to) {
    return { from: to, to: from }
  }

  return { from, to }
}

export function isRangeActive(from: string | null, to: string | null): boolean {
  return from !== null || to !== null
}

/**
 * Cool season (garúa), labelled "Winter season" on the range bar: 1 Jun–30 Nov.
 * After 30 Nov the next window is the following year. Requirements do not name this span.
 */
export function winterSeason(today: string): DateRangeBounds {
  const year = calendarYear(today)
  const month = Number(today.slice(5, 7))
  const seasonYear = month === 12 ? year + 1 : year

  return { from: `${seasonYear}-06-01`, to: `${seasonYear}-11-30` }
}

export function daysBetween(from: string, to: string): number {
  const span = parseUtc(to).getTime() - parseUtc(from).getTime()

  return Math.round(span / 86_400_000)
}

export function shiftRange(from: string, to: string, direction: -1 | 1): DateRangeBounds {
  const span = Math.max(daysBetween(from, to), 1)
  const delta = span * direction

  return normalizeRange(addDays(from, delta), addDays(to, delta))
}

export function anchorToday(from: string | null, to: string | null, today: string): DateRangeBounds {
  if (from !== null && to !== null) {
    const span = Math.max(daysBetween(from, to), 1)

    return { from: today, to: addDays(today, span) }
  }

  return { from: today, to: addMonths(today, 6) }
}

export function matchingPreset(from: string | null, to: string | null, today: string): DateRangePreset {
  if (!isRangeActive(from, to)) {
    return 'all'
  }

  for (const key of QUICK_PRESETS) {
    const range = resolveDateRange(key, today)

    if (range.from === from && range.to === to) {
      return key
    }
  }

  return 'custom'
}

export function formatRangeDate(iso: string): string {
  const date = parseUtc(iso)
  const weekday = SHORT_WEEKDAYS[date.getUTCDay()]
  const day = String(date.getUTCDate()).padStart(2, '0')
  const month = SHORT_MONTHS[date.getUTCMonth()]

  return `${weekday ?? 'Sun'} ${day} ${month ?? 'Jan'} ${date.getUTCFullYear()}`
}
