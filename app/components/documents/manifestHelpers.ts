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
