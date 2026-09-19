export type CellState = 'Yes' | 'No' | 'Own only' | 'Any' | 'Locked'

export const OWN_RECORDS_PERMISSIONS = [
  'bookings.change_status',
  'bookings.move',
  'requests.confirm',
  'requests.release',
  'pipeline.move_stage'
] as const

export type OwnRecordsPermission = (typeof OWN_RECORDS_PERMISSIONS)[number]

const ACT_ON_ANY = 'records.act_on_any'

export function isOwnRecordsPermission(permission: string): boolean {
  return (OWN_RECORDS_PERMISSIONS as ReadonlyArray<string>).includes(permission)
}

export function cellState(input: {
  isAdmin: boolean
  permissions: Array<string>
  permission: string
}): CellState {
  if (input.isAdmin) {
    return 'Locked'
  }

  const granted = input.permissions.includes(input.permission)
  const ownRecords = isOwnRecordsPermission(input.permission)
  const actOnAny = input.permissions.includes(ACT_ON_ANY)

  if (ownRecords && granted && actOnAny) {
    return 'Any'
  }

  if (ownRecords && granted) {
    return 'Own only'
  }

  return granted ? 'Yes' : 'No'
}

export function cellLabel(
  state: CellState,
  permission: string,
  permissions: Array<string>
): string {
  if (state === 'Locked') {
    return isOwnRecordsPermission(permission) && permissions.includes(ACT_ON_ANY)
      ? '✓ Any'
      : '✓ Yes'
  }

  if (state === 'Any') {
    return '✓ Any'
  }

  if (state === 'Yes') {
    return '✓ Yes'
  }

  if (state === 'Own only') {
    return 'Own only'
  }

  return '✗ No'
}
