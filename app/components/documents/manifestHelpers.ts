import type { ManifestRow } from '../../types/api'

export type ManifestNoticeOffsets = {
  fit: number | null
  charter: number | null
  captain: number | null
}

export function manifestStatusClass(status: string): string {
  if (status === 'READY') {
    return 'p-conf'
  }

  if (status === 'OVERDUE DATA') {
    return 'p-canc'
  }

  if (status.endsWith('PENDING')) {
    return 'p-pend'
  }

  return ''
}

export function manifestNoticeOffsets(
  rows: Array<Pick<ManifestRow, 'charter' | 'dpng_offset_days' | 'captain_offset_days'>>
): ManifestNoticeOffsets {
  const fit = rows.find(row => !row.charter)
  const charter = rows.find(row => row.charter)
  const captain = rows[0]

  return {
    fit: fit?.dpng_offset_days ?? null,
    charter: charter?.dpng_offset_days ?? null,
    captain: captain?.captain_offset_days ?? null
  }
}

export function offsetLabel(days: number | null): string {
  if (days === null) {
    return '—'
  }

  return `T−${String(days)}`
}

export function manifestBarWidth(complete: number, passengers: number): string {
  if (passengers <= 0) {
    return '0%'
  }

  return `${String(Math.round((complete / passengers) * 100))}%`
}
