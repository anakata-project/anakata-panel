import type { AlertKindRow } from '../../types/api'

export function alertSeverityClass(severity: string): string {
  if (severity === 'CRITICAL') {
    return 'p-canc'
  }

  if (severity === 'WARN') {
    return 'p-hold'
  }

  if (severity === 'INFO') {
    return 'p-pend'
  }

  return ''
}

export function alertBadgeClass(counts: { CRITICAL: number, WARN: number }): string {
  if (counts.CRITICAL > 0) {
    return alertSeverityClass('CRITICAL')
  }

  if (counts.WARN > 0) {
    return alertSeverityClass('WARN')
  }

  return ''
}

export function seesAnyAlert(
  kinds: Array<Pick<AlertKindRow, 'audience'>>,
  holds: (permission: string) => boolean
): boolean {
  return kinds.some(kind => kind.audience.some(entry => holds(entry.value)))
}
