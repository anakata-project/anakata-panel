const DROP_STAGES: ReadonlyArray<string> = ['NEW_LEAD', 'QUALIFYING', 'QUOTED', 'NEGOTIATION', 'LOST']
const DAY_MS = 86_400_000

export function slaBadge(state: string | null): string | null {
  if (state === 'ok') {
    return 'IN SLA'
  }

  if (state === 'warn') {
    return 'NEAR SLA'
  }

  if (state === 'bad') {
    return 'SLA BREACH'
  }

  return null
}

export function taskPriorityClass(priority: string): string {
  if (priority === 'bad' || priority === 'warn') {
    return priority
  }

  return 'ok'
}

export function canDropOn(stage: string, card: { may_move: boolean }): boolean {
  return card.may_move && DROP_STAGES.includes(stage)
}

export function relativeDue(dueAt: string, now = Date.now()): string {
  const due = Date.parse(dueAt)

  if (Number.isNaN(due)) {
    return dueAt
  }

  if (due < now) {
    return 'OVERDUE'
  }

  if (due - now < DAY_MS) {
    return 'TODAY'
  }

  return dueAt.slice(0, 10)
}
