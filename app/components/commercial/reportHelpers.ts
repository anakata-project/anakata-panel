/**
 * Display helpers for the reports page.
 * Retention days come from the published rules document. A missing field stays null.
 */

export function retentionDays(document: unknown): number | null {
  if (typeof document !== 'object' || document === null || !('reports' in document)) {
    return null
  }

  const reports = document.reports

  if (typeof reports !== 'object' || reports === null || !('retention_days' in reports)) {
    return null
  }

  const days = reports.retention_days

  if (typeof days !== 'number' || !Number.isInteger(days) || days < 1) {
    return null
  }

  return days
}

export function isScheduledRun(requestedBy: number | null): boolean {
  return requestedBy === null
}
