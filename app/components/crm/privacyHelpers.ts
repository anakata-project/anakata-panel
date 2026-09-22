export function consentStateLabel(state: boolean | null): string {
  if (state === true) {
    return 'OPTED IN'
  }

  if (state === false) {
    return 'NOT OPTED IN'
  }

  return 'NO RECORD'
}

export function subjectRequestDueClass(dueAt: string, status: string, overdue?: boolean): string {
  if (status !== 'OPEN') {
    return ''
  }

  if (typeof overdue === 'boolean') {
    return overdue ? 'bad' : ''
  }

  const due = Date.parse(dueAt)

  if (Number.isNaN(due)) {
    return ''
  }

  return due < Date.now() ? 'bad' : ''
}
