<script setup lang="ts">
import type { Paginated, Role, UserListItem, UserStatus } from '../../types/api'
import { ApiError } from '../../../../anakata-ui/app/composables/useApi'
import { formatFlags } from './formatFlags'

type PillTone = 'neutral' | 'ok' | 'warn' | 'coral' | 'sand'

const SEARCH_DEBOUNCE_MS = 300

const props = defineProps<{
  roles: Array<Role>
}>()

const { t } = useI18n()
const { useFetch, request } = useApi()
const { user: me } = useAuth()
const { format } = useDates()
const toast = useToast()

const searchInput = ref('')
const search = ref('')
const statusFilter = ref<'all' | UserStatus>('all')
const roleFilter = ref<number | 'all'>('all')
const page = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
  }, SEARCH_DEBOUNCE_MS)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})

watch([search, statusFilter, roleFilter], () => {
  page.value = 1
})

const query = computed(() => {
  const params: {
    q?: string
    status?: UserStatus
    role_id?: number
    page: number
    per_page: number
  } = {
    page: page.value,
    per_page: 25
  }

  if (search.value !== '') {
    params.q = search.value
  }

  if (statusFilter.value !== 'all') {
    params.status = statusFilter.value
  }

  if (roleFilter.value !== 'all') {
    params.role_id = roleFilter.value
  }

  return params
})

const { data: usersPage, refresh } = useFetch<Paginated<UserListItem>>('/api/rms/users', {
  query
})

const users = computed(() => usersPage.value?.data ?? [])
const meta = computed(() => usersPage.value?.meta)

const statusItems = computed(() => [
  { label: t('admin.statusAll'), value: 'all' as const },
  { label: t('admin.statusActive'), value: 'active' },
  { label: t('admin.statusInvited'), value: 'invited' },
  { label: t('admin.statusDisabled'), value: 'disabled' }
])

const roleFilterItems = computed(() => [
  { label: t('admin.roleAll'), value: 'all' as const },
  ...props.roles.map(role => ({
    label: role.name,
    value: role.id
  }))
])

const inviteOpen = ref(false)
const editOpen = ref(false)
const disableOpen = ref(false)
const historyOpen = ref(false)
const selected = ref<UserListItem | null>(null)

const historyUrl = computed(() => {
  return selected.value ? `/api/rms/users/${selected.value.id}/history` : null
})

function isSelf(row: UserListItem): boolean {
  return me.value?.id === row.id
}

function statusTone(status: string): PillTone {
  if (status === 'active') {
    return 'ok'
  }

  if (status === 'invited') {
    return 'sand'
  }

  if (status === 'disabled') {
    return 'coral'
  }

  return 'neutral'
}

function statusLabel(status: string): string {
  if (status === 'active') {
    return t('admin.statusActive')
  }

  if (status === 'invited') {
    return t('admin.statusInvited')
  }

  if (status === 'disabled') {
    return t('admin.statusDisabled')
  }

  return status
}

function openEdit(row: UserListItem): void {
  selected.value = row
  editOpen.value = true
}

function openDisable(row: UserListItem): void {
  selected.value = row
  disableOpen.value = true
}

function openHistory(row: UserListItem): void {
  selected.value = row
  historyOpen.value = true
}

async function runRowAction(path: string, successKey: string): Promise<void> {
  try {
    await request(path, { method: 'POST' })
    toast.add({ title: t(successKey) })
    await refresh()
  } catch (error: unknown) {
    if (error instanceof ApiError && (error.status === 409 || error.status === 403)) {
      toast.add({ title: error.message })
      return
    }

    throw error
  }
}

function previousPage(): void {
  if (page.value > 1) {
    page.value -= 1
  }
}

function nextPage(): void {
  if (meta.value && page.value < meta.value.last_page) {
    page.value += 1
  }
}

const pagerText = computed(() => {
  if (!meta.value || meta.value.total === 0) {
    return ''
  }

  return t('admin.pager', {
    from: String(meta.value.from ?? 0),
    to: String(meta.value.to ?? 0),
    total: String(meta.value.total)
  })
})
</script>

<template>
  <AnkPanel :title="t('admin.teamMembers')">
    <div class="list-toolbar">
      <div class="list-filters">
        <UInput
          v-model="searchInput"
          size="sm"
          :placeholder="t('admin.searchPlaceholder')"
          class="list-search"
        />
        <USelect
          v-model="statusFilter"
          size="sm"
          :items="statusItems"
        />
        <USelect
          v-model="roleFilter"
          size="sm"
          :items="roleFilterItems"
        />
      </div>
      <UButton @click="inviteOpen = true">
        {{ t('admin.invite') }}
      </UButton>
    </div>

    <table class="list">
      <thead>
        <tr>
          <th>{{ t('admin.user') }}</th>
          <th>{{ t('admin.role') }}</th>
          <th>{{ t('admin.flags') }}</th>
          <th>{{ t('admin.status') }}</th>
          <th class="list-actions">
            {{ t('admin.actions') }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-if="users.length === 0"
          class="dr-empty"
        >
          <td colspan="5">
            {{ t('admin.empty') }}
          </td>
        </tr>
        <tr
          v-for="row in users"
          :key="row.id"
        >
          <td>
            <div class="user-cell">
              <span>{{ row.name }}</span>
              <span class="user-email">{{ row.email }}</span>
            </div>
          </td>
          <td>{{ row.role.name }}</td>
          <td>{{ formatFlags(row.flags) }}</td>
          <td>
            <UTooltip
              v-if="row.last_login_at"
              :text="t('admin.lastSignIn', { time: format(row.last_login_at, 'dateTime') })"
            >
              <AnkPill :tone="statusTone(row.status)">
                {{ statusLabel(row.status) }}
              </AnkPill>
            </UTooltip>
            <AnkPill
              v-else
              :tone="statusTone(row.status)"
            >
              {{ statusLabel(row.status) }}
            </AnkPill>
          </td>
          <td class="list-actions">
            <div class="row-actions">
              <UButton
                variant="outline"
                size="sm"
                @click="openEdit(row)"
              >
                {{ t('admin.edit') }}
              </UButton>
              <UButton
                v-if="row.status !== 'disabled' && !isSelf(row)"
                variant="outline"
                size="sm"
                @click="openDisable(row)"
              >
                {{ t('admin.disable') }}
              </UButton>
              <UButton
                v-if="row.status === 'disabled'"
                variant="outline"
                size="sm"
                @click="runRowAction(`/api/rms/users/${row.id}/enable`, 'admin.enabledToast')"
              >
                {{ t('admin.enable') }}
              </UButton>
              <UButton
                v-if="row.status === 'invited'"
                variant="outline"
                size="sm"
                @click="runRowAction(`/api/rms/users/${row.id}/resend-invitation`, 'admin.resentToast')"
              >
                {{ t('admin.resend') }}
              </UButton>
              <UButton
                variant="outline"
                size="sm"
                @click="openHistory(row)"
              >
                {{ t('admin.history') }}
              </UButton>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <div
      v-if="meta && meta.total > 0"
      class="list-pager"
    >
      <button
        type="button"
        :disabled="page <= 1"
        @click="previousPage"
      >
        {{ t('admin.previous') }}
      </button>
      <span>{{ pagerText }}</span>
      <button
        type="button"
        :disabled="page >= meta.last_page"
        @click="nextPage"
      >
        {{ t('admin.next') }}
      </button>
    </div>
  </AnkPanel>

  <AdminInviteUserModal
    v-model:open="inviteOpen"
    :roles="props.roles"
    @invited="refresh"
  />
  <AdminEditUserModal
    v-model:open="editOpen"
    :user="selected"
    :roles="props.roles"
    :is-self="selected ? isSelf(selected) : false"
    @saved="refresh"
  />
  <AdminDisableUserModal
    v-model:open="disableOpen"
    :user="selected"
    @disabled="refresh"
  />
  <HistoryDrawer
    v-model:open="historyOpen"
    :title="selected?.name ?? ''"
    :subject-type="t('history.subjectUser')"
    :url="historyUrl"
  />
</template>
