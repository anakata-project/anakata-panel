export function deliveryStatusClass(status: string): string {
  if (status === 'FAILED' || status === 'BLOCKED') {
    return 'bad'
  }

  if (status === 'SENT') {
    return 'ok'
  }

  return ''
}

export function formatMeasure(value: number | null): string {
  if (value === null) {
    return '—'
  }

  return String(value)
}
