<script setup lang="ts">
import type { PermissionItem, Role } from '../../../types/api'

const { can } = useAuth()
const { useFetch } = useApi()

const { data: rolesPayload, refresh: refreshRoles } = useFetch<{ data: Array<Role> }>('/api/rms/roles')
const { data: permissionsPayload } = useFetch<{ data: Array<PermissionItem> }>('/api/rms/permissions')

const roles = computed(() => rolesPayload.value?.data ?? [])
const permissions = computed(() => permissionsPayload.value?.data ?? [])
</script>

<template>
  <div>
    <AdminRoleMatrixPanel
      :roles="roles"
      :permissions="permissions"
      :can-edit="can('roles.manage')"
      :refresh-roles="refreshRoles"
    />
    <AdminTeamMembersPanel
      v-if="can('users.manage')"
      :roles="roles"
    />
  </div>
</template>
