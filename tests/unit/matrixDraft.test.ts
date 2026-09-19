import { describe, expect, it } from 'vitest'
import {
  accessLoss,
  changeCount,
  draftDiff,
  isCellDirty,
  rebaseAfterPartialSave,
  snapshotPermissions,
  togglePermission
} from '../../app/components/admin/matrixDraft'

const baseline = {
  2: ['panel.rms', 'bookings.create'],
  3: ['panel.rms', 'bookings.view_all']
}

describe('draftDiff and changeCount', () => {
  it('returns no diffs when the sets match', () => {
    expect(draftDiff(baseline, {
      2: ['panel.rms', 'bookings.create'],
      3: ['panel.rms', 'bookings.view_all']
    })).toEqual([])
    expect(changeCount([])).toBe(0)
  })

  it('lists added and removed permissions per changed role', () => {
    const diffs = draftDiff(baseline, {
      2: ['panel.rms', 'bookings.create', 'bookings.delete'],
      3: ['bookings.view_all']
    })

    expect(diffs).toEqual([
      { roleId: 2, added: ['bookings.delete'], removed: [] },
      { roleId: 3, added: [], removed: ['panel.rms'] }
    ])
    expect(changeCount(diffs)).toBe(2)
  })

  it('marks a cell dirty only when that permission flipped', () => {
    expect(isCellDirty(baseline[2], ['panel.rms', 'bookings.create', 'bookings.delete'], 'bookings.delete')).toBe(true)
    expect(isCellDirty(baseline[2], ['panel.rms', 'bookings.create', 'bookings.delete'], 'panel.rms')).toBe(false)
  })

  it('toggles a permission on and off', () => {
    expect(togglePermission(['panel.rms'], 'bookings.delete')).toEqual(['panel.rms', 'bookings.delete'])
    expect(togglePermission(['panel.rms', 'bookings.delete'], 'bookings.delete')).toEqual(['panel.rms'])
  })
})

describe('accessLoss', () => {
  it('flags panel.rms on any role and manage flags only on the signed-in role', () => {
    const diffs = draftDiff(baseline, {
      2: ['bookings.create', 'roles.manage'],
      3: ['panel.rms', 'bookings.view_all']
    })

    expect(accessLoss(diffs, 2)).toEqual({
      losesRms: true,
      losesUsersManage: false,
      losesRolesManage: false
    })

    const ownManage = draftDiff(
      { 2: ['users.manage', 'roles.manage', 'panel.rms'] },
      { 2: ['panel.rms'] }
    )

    expect(accessLoss(ownManage, 2)).toEqual({
      losesRms: false,
      losesUsersManage: true,
      losesRolesManage: true
    })
  })
})

describe('rebaseAfterPartialSave', () => {
  it('rebases saved roles and keeps only unsaved draft cells', () => {
    const draft = {
      2: ['panel.rms', 'bookings.create', 'bookings.delete'],
      3: ['panel.rms', 'bookings.view_all', 'bookings.delete']
    }

    const rebased = rebaseAfterPartialSave({
      baseline,
      draft,
      savedRoleIds: [2],
      refreshedRoles: [
        { id: 2, permissions: ['panel.rms', 'bookings.create', 'bookings.delete'] },
        { id: 3, permissions: ['panel.rms', 'bookings.view_all'] }
      ]
    })

    expect(rebased.baseline).toEqual({
      2: ['panel.rms', 'bookings.create', 'bookings.delete'],
      3: ['panel.rms', 'bookings.view_all']
    })
    expect(rebased.draft).toEqual({
      2: ['panel.rms', 'bookings.create', 'bookings.delete'],
      3: ['panel.rms', 'bookings.view_all', 'bookings.delete']
    })

    const remaining = draftDiff(rebased.baseline, rebased.draft)

    expect(remaining).toEqual([
      { roleId: 3, added: ['bookings.delete'], removed: [] }
    ])
    expect(changeCount(remaining)).toBe(1)
  })

  it('uses refreshed permissions as the new snapshot for every role', () => {
    expect(snapshotPermissions([
      { id: 1, permissions: ['panel.rms'] }
    ])).toEqual({ 1: ['panel.rms'] })
  })
})
