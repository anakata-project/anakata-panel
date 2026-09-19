import { describe, expect, it } from 'vitest'
import { describeHistory } from '../../app/components/history/describe'

const strings: Record<string, string> = {
  'history.events.userInvitedAs': 'Invited as {role}',
  'history.events.userInvited': 'Invited',
  'history.events.userActivated': 'Invitation accepted',
  'history.events.userInvitationResent': 'Invitation resent',
  'history.events.userUpdated': 'Name changed · {before} → {after}',
  'history.events.userRoleChanged': 'Role changed · {before} → {after}',
  'history.events.userDisabled': 'Disabled',
  'history.events.userEnabled': 'Enabled',
  'history.events.roleCreated': 'Role created',
  'history.events.roleUpdated': 'Permissions changed · added: {added}, removed: {removed}',
  'history.events.roleDeleted': 'Role deleted',
  'history.events.unknown': '{event} · {summary}'
}

function t(key: string, params?: Record<string, string>): string {
  let out = strings[key] ?? key

  if (params) {
    for (const [name, value] of Object.entries(params)) {
      out = out.replaceAll(`{${name}}`, value)
    }
  }

  return out
}

describe('describeHistory', () => {
  it('uses after.role for invited, and falls back when it is missing', () => {
    expect(describeHistory({
      event: 'user.invited',
      before: null,
      after: { role: 'Manager' }
    }, t)).toBe('Invited as Manager')

    expect(describeHistory({
      event: 'user.invited',
      before: null,
      after: null
    }, t)).toBe('Invited')
  })

  it('maps the known user and role events', () => {
    expect(describeHistory({ event: 'user.activated', before: null, after: null }, t)).toBe('Invitation accepted')
    expect(describeHistory({ event: 'user.invitation_resent', before: null, after: null }, t)).toBe('Invitation resent')
    expect(describeHistory({
      event: 'user.updated',
      before: { name: 'Ada' },
      after: { name: 'Ada Lovelace' }
    }, t)).toBe('Name changed · Ada → Ada Lovelace')
    expect(describeHistory({
      event: 'user.role_changed',
      before: { role: 'Sales Exec' },
      after: { role: 'Manager' }
    }, t)).toBe('Role changed · Sales Exec → Manager')
    expect(describeHistory({ event: 'user.disabled', before: null, after: null }, t)).toBe('Disabled')
    expect(describeHistory({ event: 'user.enabled', before: null, after: null }, t)).toBe('Enabled')
    expect(describeHistory({ event: 'role.created', before: null, after: null }, t)).toBe('Role created')
    expect(describeHistory({
      event: 'role.updated',
      before: { permissions: ['panel.rms'] },
      after: { added: ['users.manage'], removed: [] }
    }, t)).toBe('Permissions changed · added: users.manage, removed: —')
    expect(describeHistory({ event: 'role.deleted', before: null, after: null }, t)).toBe('Role deleted')
  })

  it('never renders raw JSON for an unknown event', () => {
    expect(describeHistory({
      event: 'booking.moved',
      before: { cabin: 'S1' },
      after: { cabin: 'S2' }
    }, t)).toBe('booking.moved · cabin: S1 → S2')
  })
})
