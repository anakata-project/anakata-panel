export function roleEllipsisTooltip(dirty: boolean, saveDraftFirst: string): string {
  return dirty ? saveDraftFirst : ''
}

export function roleDeleteTooltip(input: {
  dirty: boolean
  usersCount: number
  deleteBlocked: string
}): string {
  if (input.dirty || input.usersCount === 0) {
    return ''
  }

  return input.deleteBlocked
}
