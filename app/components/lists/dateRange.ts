export type DateRangePreset = 'all' | 'last30' | 'last90' | 'next90' | 'next12' | 'custom' | `y${number}`

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

  if (preset === 'next90') {
    return { from: today, to: addDays(today, 90) }
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
