<script setup lang="ts">
import type { Permission, PermissionItem, Role, UpdateRoleRequest } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { roleDeleteTooltip, roleEllipsisTooltip } from './roleMenu'
import { cellLabel, cellState } from './matrixCell'
import {
  accessLoss,
  changeCount,
  draftDiff,
  isCellDirty,
  rebaseAfterPartialSave,
  snapshotPermissions,
  togglePermission,
  type PermissionSet
} from './matrixDraft'

const props = defineProps<{
  roles: Array<Role>
  permissions: Array<PermissionItem>
  canEdit: boolean
  refreshRoles: () => Promise<unknown>
}>()

const { t } = useI18n()
const { request } = useApi()
const { user: me, fetchMe } = useAuth()
const toast = useToast()

const baseline = ref<PermissionSet>({})
const draft = ref<PermissionSet>({})
const warn = ref('')
const saving = ref(false)
const createOpen = ref(false)
const renameOpen = ref(false)
const deleteOpen = ref(false)
const accessOpen = ref(false)
const historyOpen = ref(false)
const selected = ref<Role | null>(null)

const diffs = computed(() => draftDiff(baseline.value, draft.value))
const dirty = computed(() => diffs.value.length > 0)
const nChanges = computed(() => changeCount(diffs.value))

const groups = computed(() => {
  const out: Array<{
    key: string
    label: string
    items: Array<PermissionItem>
  }> = []

  for (const item of props.permissions) {
    const last = out[out.length - 1]

    if (last && last.key === item.group) {
      last.items.push(item)
      continue
    }

    out.push({
      key: item.group,
      label: item.is_flag
        ? t('admin.flagGroup', { label: item.group_label })
        : item.group_label,
      items: [item]
    })
  }

  return out
})

const historyUrl = computed(() => {
  return selected.value ? `/api/rms/roles/${selected.value.id}/history` : null
})

const loss = computed(() => accessLoss(diffs.value, me.value?.role.id))

const accessLossWhat = computed(() => {
  const parts: Array<string> = []

  if (loss.value.losesRms) {
    parts.push(t('admin.accessLossRms'))
  }

  if (loss.value.losesUsersManage) {
    parts.push(t('admin.accessLossUsers'))
  }

  if (loss.value.losesRolesManage) {
    parts.push(t('admin.accessLossRoles'))
  }

  return parts.join(', ')
})

const needsAccessConfirm = computed(() => {
  return loss.value.losesRms || loss.value.losesUsersManage || loss.value.losesRolesManage
})

function permissionLabel(value: string): string {
  return props.permissions.find(item => item.value === value)?.label ?? value
}

function permissionsOf(roleId: number): Array<string> {
  return draft.value[roleId] ?? []
}

function baselineOf(roleId: number): Array<string> {
  return baseline.value[roleId] ?? []
}

function usersLabel(count: number): string {
  return count === 1
    ? t('admin.usersCountOne')
    : t('admin.usersCount', { n: String(count) })
}

function displayCell(role: Role, permission: string): string {
  const permissions = permissionsOf(role.id)
  const state = cellState({
    isAdmin: role.is_admin,
    permissions,
    permission
  })

  return cellLabel(state, permission, permissions)
}

function cellDirty(role: Role, permission: string): boolean {
  return isCellDirty(baselineOf(role.id), permissionsOf(role.id), permission)
}

function canToggle(role: Role): boolean {
  return props.canEdit && !role.is_admin
}

function toggleCell(role: Role, permission: string): void {
  if (!canToggle(role)) {
    return
  }

  draft.value = {
    ...draft.value,
    [role.id]: togglePermission(permissionsOf(role.id), permission)
  }
}

function snapshotFromRoles(roles: Array<Role>): void {
  const snap = snapshotPermissions(roles)
  baseline.value = snap
  draft.value = snapshotPermissions(roles)
}

watch(() => props.roles, (roles) => {
  if (!dirty.value) {
    snapshotFromRoles(roles)
  }
}, { immediate: true })

function cancelDraft(): void {
  draft.value = snapshotPermissions(
    Object.entries(baseline.value).map(([id, permissions]) => ({
      id: Number(id),
      permissions
    }))
  )
  warn.value = ''
}

function menuTooltip(): string {
  return roleEllipsisTooltip(dirty.value, t('admin.saveDraftFirst'))
}

function deleteTooltip(role: Role): string {
  return roleDeleteTooltip({
    dirty: dirty.value,
    usersCount: role.users_count,
    deleteBlocked: t('admin.deleteBlocked', { n: String(role.users_count) })
  })
}

function menuItemLabel(item: unknown): string {
  if (typeof item !== 'object' || item === null || !('label' in item)) {
    return ''
  }

  return typeof item.label === 'string' ? item.label : ''
}

function menuItemTooltip(item: unknown): string {
  if (typeof item !== 'object' || item === null || !('tooltipText' in item)) {
    return ''
  }

  return typeof item.tooltipText === 'string' ? item.tooltipText : ''
}

function roleMenu(role: Role) {
  const items: Array<{
    label: string
    disabled?: boolean
    slot?: string
    tooltipText?: string
    onSelect: () => void
  }> = [
    {
      label: t('admin.history'),
      onSelect: () => openHistory(role)
    }
  ]

  if (!role.is_system) {
    items.push({
      label: t('admin.rename'),
      disabled: dirty.value,
      onSelect: () => {
        if (!dirty.value) {
          openRename(role)
        }
      }
    })
    items.push({
      label: t('admin.delete'),
      slot: 'delete',
      disabled: dirty.value || role.users_count > 0,
      tooltipText: deleteTooltip(role),
      onSelect: () => {
        if (!dirty.value && role.users_count === 0) {
          openDelete(role)
        }
      }
    })
  }

  return items
}

function openHistory(role: Role): void {
  selected.value = role
  historyOpen.value = true
}

function openRename(role: Role): void {
  selected.value = role
  renameOpen.value = true
}

function openDelete(role: Role): void {
  selected.value = role
  deleteOpen.value = true
}

function openCreate(): void {
  if (!dirty.value) {
    createOpen.value = true
  }
}

async function onRolesMutated(): Promise<void> {
  await props.refreshRoles()
  snapshotFromRoles(props.roles)
}

function requestSave(): void {
  if (needsAccessConfirm.value) {
    accessOpen.value = true
    return
  }

  void saveDraft()
}

async function confirmAccessLoss(): Promise<void> {
  accessOpen.value = false
  await saveDraft()
}

async function saveDraft(): Promise<void> {
  warn.value = ''
  saving.value = true

  const savedIds: Array<number> = []
  const pending = diffs.value
  let failed = false

  try {
    for (const diff of pending) {
      const body: UpdateRoleRequest = {
        permissions: permissionsOf(diff.roleId) as Array<Permission>
      }

      try {
        await request(`/api/rms/roles/${diff.roleId}`, {
          method: 'PATCH',
          body
        })
        savedIds.push(diff.roleId)
      } catch (error: unknown) {
        const message = firstApiMessage(error)

        if (message) {
          warn.value = message
          await props.refreshRoles()
          const rebased = rebaseAfterPartialSave({
            baseline: baseline.value,
            draft: draft.value,
            savedRoleIds: savedIds,
            refreshedRoles: props.roles
          })
          baseline.value = rebased.baseline
          draft.value = rebased.draft
          failed = true
          break
        }

        throw error
      }
    }

    if (!failed) {
      toast.add({ title: t('admin.savedMatrixToast') })
      await props.refreshRoles()
      snapshotFromRoles(props.roles)
    }

    if (me.value && savedIds.includes(me.value.role.id)) {
      await fetchMe()
    }
  } finally {
    saving.value = false
  }
}

useUnsavedGuard(dirty, () => t('admin.leaveUnsaved'))
</script>

<template>
  <AnkPanel :title="t('admin.matrixTitle')">
    <template
      v-if="canEdit"
      #actions
    >
      <UTooltip
        :text="t('admin.saveDraftFirst')"
        :disabled="!dirty"
      >
        <span class="matrix-tip">
          <UButton
            variant="outline"
            :disabled="dirty"
            @click="openCreate"
          >
            {{ t('admin.newRole') }}
          </UButton>
        </span>
      </UTooltip>
    </template>

    <div
      v-if="warn"
      class="warnbox matrix-warn"
    >
      {{ warn }}
    </div>

    <div class="matrix-scroll">
      <table class="list">
        <thead>
          <tr>
            <th class="matrix-sticky">
              {{ t('admin.action') }}
            </th>
            <th
              v-for="role in roles"
              :key="role.id"
              class="matrix-role"
            >
              <div class="matrix-role-head">
                <span>{{ role.name }}</span>
                <span class="matrix-users">{{ usersLabel(role.users_count) }}</span>
                <UTooltip
                  v-if="canEdit"
                  :text="menuTooltip()"
                  :disabled="menuTooltip() === ''"
                >
                  <UDropdownMenu :items="roleMenu(role)">
                    <template #delete-label="{ item }">
                      <UTooltip
                        :text="menuItemTooltip(item)"
                        :disabled="menuItemTooltip(item) === ''"
                      >
                        <span>{{ menuItemLabel(item) }}</span>
                      </UTooltip>
                    </template>
                    <UButton
                      variant="outline"
                      size="sm"
                      :aria-label="t('admin.roleMenu')"
                    >
                      ···
                    </UButton>
                  </UDropdownMenu>
                </UTooltip>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <template
            v-for="group in groups"
            :key="group.key"
          >
            <tr class="matrix-group">
              <td class="navsec matrix-sticky">
                {{ group.label }}
              </td>
              <td
                v-for="role in roles"
                :key="`${group.key}-${role.id}`"
                class="navsec"
              />
            </tr>
            <tr
              v-for="permission in group.items"
              :key="permission.value"
            >
              <td class="matrix-sticky">
                {{ permission.label }}
              </td>
              <td
                v-for="role in roles"
                :key="`${role.id}-${permission.value}`"
                class="matrix-role"
                :class="{ 'matrix-cell--dirty': cellDirty(role, permission.value) }"
              >
                <button
                  v-if="canToggle(role)"
                  type="button"
                  class="matrix-cell-btn"
                  @click="toggleCell(role, permission.value)"
                >
                  {{ displayCell(role, permission.value) }}
                </button>
                <UTooltip
                  v-else-if="role.is_admin"
                  :text="t('admin.adminLocked')"
                >
                  <span>{{ displayCell(role, permission.value) }}</span>
                </UTooltip>
                <span v-else>{{ displayCell(role, permission.value) }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div
      v-if="canEdit && dirty"
      class="matrix-bar"
    >
      <span>{{ t('admin.changesBar', { n: String(nChanges) }) }}</span>
      <div class="matrix-bar-actions">
        <UButton
          variant="outline"
          :disabled="saving"
          @click="cancelDraft"
        >
          {{ t('admin.cancel') }}
        </UButton>
        <UButton
          :loading="saving"
          :disabled="saving"
          @click="requestSave"
        >
          {{ t('admin.save') }}
        </UButton>
      </div>
    </div>
  </AnkPanel>

  <AdminCreateRoleModal
    v-model:open="createOpen"
    :roles="roles"
    @created="onRolesMutated"
  />
  <AdminRenameRoleModal
    v-model:open="renameOpen"
    :role="selected"
    @renamed="onRolesMutated"
  />
  <AdminDeleteRoleModal
    v-model:open="deleteOpen"
    :role="selected"
    @deleted="onRolesMutated"
  />
  <UModal
    :open="accessOpen"
    :title="t('admin.accessLossTitle')"
    @update:open="accessOpen = $event"
  >
    <template #body>
      <div class="modal-form">
        <div class="warnbox">
          {{ t('admin.accessLossBody', { what: accessLossWhat }) }}
        </div>
        <div class="modal-actions">
          <UButton
            variant="outline"
            @click="accessOpen = false"
          >
            {{ t('admin.cancel') }}
          </UButton>
          <UButton @click="confirmAccessLoss">
            {{ t('admin.accessLossContinue') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
  <HistoryDrawer
    v-model:open="historyOpen"
    :title="selected?.name ?? ''"
    :subject-type="t('history.subjectRole')"
    :url="historyUrl"
    :permission-label="permissionLabel"
  />
</template>
