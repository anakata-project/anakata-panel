export function systemBadgeClass(value: string): string {
  const token = value.trim().toUpperCase()

  if (token === 'RMS') {
    return 'sys-rms'
  }

  if (token === 'CRM') {
    return 'sys-crm'
  }

  if (token === 'ENGINE' || token === 'ENG') {
    return 'sys-eng'
  }

  if (token === 'EXTERNAL' || token === 'EXT') {
    return 'sys-ext'
  }

  return ''
}

export function sideTokens(side: string): Array<string> {
  return side
    .split('+')
    .map(token => token.trim())
    .filter(token => token !== '')
}

export function jobOutcomePillClass(outcome: string | null | undefined): string {
  if (outcome === 'failed') {
    return 'bad'
  }

  if (outcome === 'succeeded') {
    return 'ok'
  }

  if (outcome === 'running') {
    return 'mid'
  }

  return ''
}

export function isAnonymousContact(name: string): boolean {
  return name.trim().toLowerCase() === 'anonymous'
}

export function uniqueContactId(
  cell: string,
  rows: Array<{ id: number, name: string }>,
  pageFull: boolean
): number | null {
  const needle = cell.trim().toLowerCase()
  const matches = rows.filter(row => row.name.trim().toLowerCase() === needle)
  const first = matches[0]

  if (matches.length === 1 && first !== undefined && !pageFull) {
    return first.id
  }

  return null
}
