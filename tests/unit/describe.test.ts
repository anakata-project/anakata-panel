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
  'history.events.roleUpdated': 'Role updated',
  'history.events.roleRenamed': 'Renamed · {before} → {after}',
  'history.events.roleDescriptionChanged': 'Description changed',
  'history.events.rolePermissionsChanged': 'Permissions changed · {parts}',
  'history.events.roleAdded': 'added: {added}',
  'history.events.roleRemoved': 'removed: {removed}',
  'history.events.roleDeleted': 'Role deleted',
  'history.events.itineraryCreated': 'Created',
  'history.events.itineraryDeleted': 'Deleted',
  'history.events.itineraryPublished': 'Published',
  'history.events.itineraryHidden': 'Hidden from engine',
  'history.events.itineraryImageReplaced': 'Hero photo replaced',
  'history.events.itineraryUpdated': 'Updated · {summary}',
  'history.events.itineraryUpdatedBare': 'Updated',
  'history.events.departureCreated': 'Created',
  'history.events.departureDeleted': 'Deleted',
  'history.events.departureUpdated': 'Updated · {summary}',
  'history.events.departureUpdatedBare': 'Updated',
  'history.events.departureStatusChanged': 'Status · {before} → {after}',
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
    }, t)).toBe('Permissions changed · added: users.manage')
    expect(describeHistory({ event: 'role.deleted', before: null, after: null }, t)).toBe('Role deleted')
  })

  it('maps permission values to labels and composes rename / description / permission parts', () => {
    const label = (value: string): string => value === 'bookings.delete' ? 'Delete bookings' : value

    expect(describeHistory({
      event: 'role.updated',
      before: { permissions: [] },
      after: { added: ['bookings.delete'], removed: [] }
    }, t, label)).toBe('Permissions changed · added: Delete bookings')

    expect(describeHistory({
      event: 'role.updated',
      before: { name: 'Ops', description: 'A' },
      after: { name: 'Operations', description: 'B', added: ['bookings.delete'], removed: ['users.manage'] }
    }, t, label)).toBe('Renamed · Ops → Operations · Description changed · Permissions changed · added: Delete bookings, removed: users.manage')
  })

  it('maps itinerary events', () => {
    expect(describeHistory({ event: 'itinerary.created', before: null, after: null }, t)).toBe('Created')
    expect(describeHistory({ event: 'itinerary.deleted', before: null, after: null }, t)).toBe('Deleted')
    expect(describeHistory({ event: 'itinerary.published', before: null, after: { status: 'PUBLISHED' } }, t)).toBe('Published')
    expect(describeHistory({ event: 'itinerary.hidden', before: null, after: { status: 'HIDDEN' } }, t)).toBe('Hidden from engine')
    expect(describeHistory({ event: 'itinerary.image_replaced', before: null, after: null }, t)).toBe('Hero photo replaced')
    expect(describeHistory({
      event: 'itinerary.updated',
      before: { name: 'West' },
      after: { name: 'Western Realm' }
    }, t)).toBe('Updated · name: West → Western Realm')
  })

  it('maps departure events', () => {
    expect(describeHistory({ event: 'departure.created', before: null, after: null }, t)).toBe('Created')
    expect(describeHistory({ event: 'departure.deleted', before: null, after: null }, t)).toBe('Deleted')
    expect(describeHistory({
      event: 'departure.status_changed',
      before: { status: 'ON_SALE' },
      after: { status: 'CLOSED' }
    }, t)).toBe('Status · ON_SALE → CLOSED')
    expect(describeHistory({
      event: 'departure.updated',
      before: { public_note: 'Launch' },
      after: { public_note: 'Inaugural sailing' }
    }, t)).toBe('Updated · public_note: Launch → Inaugural sailing')
  })

  it('never renders raw JSON for an unknown event', () => {
    expect(describeHistory({
      event: 'booking.moved',
      before: { cabin: 'S1' },
      after: { cabin: 'S2' }
    }, t)).toBe('booking.moved · cabin: S1 → S2')
  })
})
