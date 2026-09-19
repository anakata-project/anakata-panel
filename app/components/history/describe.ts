import type { ChangeHistoryEntry } from '../../types/api'

export type HistoryTranslate = (key: string, params?: Record<string, string>) => string

function asRecord(value: { [key: string]: unknown } | null): Record<string, unknown> {
  return value ?? {}
}

function stringField(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key]

  return typeof value === 'string' && value !== '' ? value : undefined
}

function stringList(value: unknown): Array<string> {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((item): item is string => typeof item === 'string')
}

function compactValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    return value.map(item => compactValue(item)).join(', ')
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value)

    return keys.length === 0 ? '—' : keys.join(', ')
  }

  return '—'
}

function compactDiff(before: Record<string, unknown>, after: Record<string, unknown>): string {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]))
  const parts: Array<string> = []

  for (const key of keys) {
    const from = compactValue(before[key])
    const to = compactValue(after[key])

    if (from !== to) {
      parts.push(`${key}: ${from} → ${to}`)
    }
  }

  return parts.join(', ')
}

export function describeHistory(
  entry: Pick<ChangeHistoryEntry, 'event' | 'before' | 'after'>,
  t: HistoryTranslate
): string {
  const before = asRecord(entry.before)
  const after = asRecord(entry.after)

  switch (entry.event) {
    case 'user.invited': {
      const role = stringField(after, 'role')

      return role
        ? t('history.events.userInvitedAs', { role })
        : t('history.events.userInvited')
    }
    case 'user.activated':
      return t('history.events.userActivated')
    case 'user.invitation_resent':
      return t('history.events.userInvitationResent')
    case 'user.updated':
      return t('history.events.userUpdated', {
        before: stringField(before, 'name') ?? compactValue(before.name),
        after: stringField(after, 'name') ?? compactValue(after.name)
      })
    case 'user.role_changed':
      return t('history.events.userRoleChanged', {
        before: stringField(before, 'role') ?? compactValue(before.role),
        after: stringField(after, 'role') ?? compactValue(after.role)
      })
    case 'user.disabled':
      return t('history.events.userDisabled')
    case 'user.enabled':
      return t('history.events.userEnabled')
    case 'role.created':
      return t('history.events.roleCreated')
    case 'role.updated':
      return t('history.events.roleUpdated', {
        added: stringList(after.added).join(', ') || '—',
        removed: stringList(after.removed).join(', ') || '—'
      })
    case 'role.deleted':
      return t('history.events.roleDeleted')
    default: {
      const summary = compactDiff(before, after)

      return summary
        ? t('history.events.unknown', { event: entry.event, summary })
        : entry.event
    }
  }
}
