import { describe, expect, it } from 'vitest'
import { cellLabel, cellState } from '../../app/components/admin/matrixCell'

const adminPerms = [
  'panel.rms',
  'records.act_on_any',
  'bookings.create',
  'bookings.change_status',
  'bookings.move',
  'requests.confirm',
  'requests.release',
  'pipeline.move_stage'
]

const managerOwn = [
  'panel.rms',
  'bookings.create',
  'bookings.change_status',
  'bookings.move',
  'requests.confirm',
  'requests.release',
  'pipeline.move_stage'
]

describe('cellState', () => {
  it('locks every Admin cell', () => {
    expect(cellState({
      isAdmin: true,
      permissions: adminPerms,
      permission: 'bookings.create'
    })).toBe('Locked')

    expect(cellState({
      isAdmin: true,
      permissions: adminPerms,
      permission: 'bookings.change_status'
    })).toBe('Locked')
  })

  it('shows Own only when the role can act but lacks records.act_on_any', () => {
    for (const permission of [
      'bookings.change_status',
      'bookings.move',
      'requests.confirm',
      'requests.release',
      'pipeline.move_stage'
    ]) {
      expect(cellState({
        isAdmin: false,
        permissions: managerOwn,
        permission
      })).toBe('Own only')
    }
  })

  it('shows Any when the role has the permission and records.act_on_any', () => {
    const withAny = [...managerOwn, 'records.act_on_any']

    expect(cellState({
      isAdmin: false,
      permissions: withAny,
      permission: 'bookings.change_status'
    })).toBe('Any')
  })

  it('shows Yes / No for permissions that are not own-records', () => {
    expect(cellState({
      isAdmin: false,
      permissions: managerOwn,
      permission: 'bookings.create'
    })).toBe('Yes')

    expect(cellState({
      isAdmin: false,
      permissions: managerOwn,
      permission: 'bookings.delete'
    })).toBe('No')
  })
})

describe('cellLabel', () => {
  it('renders Locked own-records as ✓ Any when the role has records.act_on_any', () => {
    expect(cellLabel('Locked', 'bookings.change_status', adminPerms)).toBe('✓ Any')
    expect(cellLabel('Locked', 'bookings.create', adminPerms)).toBe('✓ Yes')
  })

  it('renders the prototype wording for the other states', () => {
    expect(cellLabel('Yes', 'bookings.create', managerOwn)).toBe('✓ Yes')
    expect(cellLabel('No', 'bookings.delete', managerOwn)).toBe('✗ No')
    expect(cellLabel('Own only', 'bookings.change_status', managerOwn)).toBe('Own only')
    expect(cellLabel('Any', 'bookings.change_status', [...managerOwn, 'records.act_on_any'])).toBe('✓ Any')
  })
})
