import type { Permission } from '../../types/api'

const FLAG_GROUP = {
  'payments.mark_wire_received': 'finance',
  'refunds.execute': 'finance',
  'refunds.approve': 'director',
  'commissions.override_cap': 'director',
  'bookings.overdue_decision': 'director'
} as const satisfies Partial<Record<Permission, 'director' | 'finance'>>

const GROUP_ORDER = ['director', 'finance'] as const

export function formatFlags(flags: Array<string>): string {
  const groups = new Set<(typeof GROUP_ORDER)[number]>()

  for (const flag of flags) {
    if (flag in FLAG_GROUP) {
      groups.add(FLAG_GROUP[flag as keyof typeof FLAG_GROUP])
    }
  }

  const ordered = GROUP_ORDER.filter(group => groups.has(group))

  return ordered.length > 0 ? ordered.join(' · ') : '—'
}
