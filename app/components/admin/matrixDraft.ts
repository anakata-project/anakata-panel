export type PermissionSet = Record<number, Array<string>>

export type RoleDiff = {
  roleId: number
  added: Array<string>
  removed: Array<string>
}

export type AccessLoss = {
  losesRms: boolean
  losesUsersManage: boolean
  losesRolesManage: boolean
}

export type RefreshedRole = {
  id: number
  permissions: Array<string>
}

function copyList(values: Array<string>): Array<string> {
  return [...values]
}

function asSet(values: Array<string>): Set<string> {
  return new Set(values)
}

export function snapshotPermissions(roles: Array<RefreshedRole>): PermissionSet {
  const set: PermissionSet = {}

  for (const role of roles) {
    set[role.id] = copyList(role.permissions)
  }

  return set
}

export function draftDiff(baseline: PermissionSet, draft: PermissionSet): Array<RoleDiff> {
  const ids = Array.from(new Set([
    ...Object.keys(baseline).map(Number),
    ...Object.keys(draft).map(Number)
  ])).sort((left, right) => left - right)

  const diffs: Array<RoleDiff> = []

  for (const roleId of ids) {
    const before = baseline[roleId] ?? []
    const after = draft[roleId] ?? []
    const beforeSet = asSet(before)
    const afterSet = asSet(after)
    const added = after.filter(value => !beforeSet.has(value)).sort()
    const removed = before.filter(value => !afterSet.has(value)).sort()

    if (added.length > 0 || removed.length > 0) {
      diffs.push({ roleId, added, removed })
    }
  }

  return diffs
}

export function changeCount(diffs: Array<RoleDiff>): number {
  return diffs.reduce((total, diff) => total + diff.added.length + diff.removed.length, 0)
}

export function isCellDirty(
  baseline: Array<string>,
  draft: Array<string>,
  permission: string
): boolean {
  return baseline.includes(permission) !== draft.includes(permission)
}

export function togglePermission(permissions: Array<string>, permission: string): Array<string> {
  return permissions.includes(permission)
    ? permissions.filter(value => value !== permission)
    : [...permissions, permission]
}

export function accessLoss(diffs: Array<RoleDiff>, signedInRoleId: number | undefined): AccessLoss {
  const own = diffs.find(diff => diff.roleId === signedInRoleId)

  return {
    losesRms: diffs.some(diff => diff.removed.includes('panel.rms')),
    losesUsersManage: own?.removed.includes('users.manage') ?? false,
    losesRolesManage: own?.removed.includes('roles.manage') ?? false
  }
}

export function rebaseAfterPartialSave(input: {
  baseline: PermissionSet
  draft: PermissionSet
  savedRoleIds: Array<number>
  refreshedRoles: Array<RefreshedRole>
}): { baseline: PermissionSet, draft: PermissionSet } {
  const saved = new Set(input.savedRoleIds)
  const baseline: PermissionSet = {}
  const draft: PermissionSet = {}

  for (const role of input.refreshedRoles) {
    baseline[role.id] = copyList(role.permissions)
    draft[role.id] = saved.has(role.id)
      ? copyList(role.permissions)
      : copyList(input.draft[role.id] ?? role.permissions)
  }

  return { baseline, draft }
}
