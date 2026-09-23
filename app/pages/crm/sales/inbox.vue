<script setup lang="ts">
import type { Conversation, ConversationStatus, Paginated } from '../../../types/api'
import ConversationDrawer from '../../../components/crm/ConversationDrawer.vue'
import ConversationLinkSearch from '../../../components/crm/ConversationLinkSearch.vue'
import { firstApiMessage } from '../../../utils/apiForm'

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()

const page = ref(1)
const statusFilter = ref<'' | ConversationStatus>('')
const unreadFilter = ref<'' | '1'>('')
const rows = ref<Array<Conversation>>([])
const meta = ref<Paginated<Conversation>['meta'] | null>(null)
const loadError = ref('')
const drawerOpen = ref(false)
const selectedId = ref<number | null>(null)

const selectedRow = computed(() => rows.value.find(row => row.id === selectedId.value) ?? null)

function contactHref(id: number): string {
  return `/crm/sales/contacts?open=${String(id)}`
}

async function load(): Promise<void> {
  const params = new URLSearchParams({
    page: String(page.value)
  })

  if (statusFilter.value !== '') {
    params.set('status', statusFilter.value)
  }

  if (unreadFilter.value === '1') {
    params.set('unread', '1')
  }

  try {
    const result = await request(`/api/crm/conversations?${params.toString()}`) as Paginated<Conversation>
    rows.value = result.data
    meta.value = result.meta
    loadError.value = ''
  } catch (caught: unknown) {
    loadError.value = firstApiMessage(caught) ?? t('crmInbox.failed')
  }
}

watch([statusFilter, unreadFilter], () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }

  void load()
})

watch(page, () => {
  void load()
})

onMounted(() => {
  void load()
})

function openRow(id: number): void {
  selectedId.value = id
  drawerOpen.value = true
}

function applyConversation(previousId: number, next: Conversation): void {
  const dropBecauseUnread = unreadFilter.value === '1' && !next.unread

  if (dropBecauseUnread) {
    rows.value = rows.value.filter(row => row.id !== previousId && row.id !== next.id)
  } else {
    const survivorElsewhere = rows.value.some(row => row.id === next.id && row.id !== previousId)

    if (survivorElsewhere) {
      rows.value = rows.value
        .filter(row => row.id !== previousId)
        .map(row => row.id === next.id ? next : row)
    } else {
      rows.value = rows.value.map(row => row.id === previousId ? next : row)
    }
  }

  if (selectedId.value === previousId) {
    selectedId.value = next.id
  }
}
</script>

<template>
  <div>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>

    <div class="panel">
      <h3>{{ t('crmInbox.title') }}</h3>
      <div class="crm-filters">
        <select v-model="statusFilter">
          <option value="">
            {{ t('crmInbox.statusAll') }}
          </option>
          <option value="OPEN">
            {{ t('crmInbox.statusOpen') }}
          </option>
          <option value="CLOSED">
            {{ t('crmInbox.statusClosed') }}
          </option>
        </select>
        <select v-model="unreadFilter">
          <option value="">
            {{ t('crmInbox.unreadAll') }}
          </option>
          <option value="1">
            {{ t('crmInbox.unreadOnly') }}
          </option>
        </select>
      </div>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmInbox.colContact') }}</th>
              <th>{{ t('crmInbox.colSubject') }}</th>
              <th>{{ t('crmInbox.colPreview') }}</th>
              <th>{{ t('crmInbox.colMessages') }}</th>
              <th>{{ t('crmInbox.colStatus') }}</th>
              <th class="nw">
                {{ t('crmInbox.colWhen') }}
              </th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="rows.length === 0"
              class="dr-empty"
            >
              <td colspan="7">
                {{ t('crmInbox.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="bk-row"
              :class="{ 'inbox-unread': row.unread }"
              @click="openRow(row.id)"
            >
              <td>
                <NuxtLink
                  v-if="row.contact_id !== null"
                  :to="contactHref(row.contact_id)"
                  @click.stop
                >
                  {{ row.contact_name }}
                </NuxtLink>
                <span
                  v-else
                  class="inbox-unmatched"
                >{{ row.from ?? '—' }}</span>
                <span
                  v-if="row.unread"
                  class="pill"
                >{{ t('crmInbox.unreadOnly') }}</span>
              </td>
              <td>{{ row.subject }}</td>
              <td>{{ row.preview || '—' }}</td>
              <td class="nw">
                {{ row.message_count }}
              </td>
              <td>
                <span class="pill">{{ row.status }}</span>
              </td>
              <td class="nw">
                {{ format(row.last_message_at, 'dateTime') }}
              </td>
              <td @click.stop>
                <ConversationLinkSearch
                  v-if="row.contact_id === null"
                  :conversation-id="row.id"
                  @linked="applyConversation(row.id, $event)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="meta && meta.last_page > 1"
        class="list-pager"
      >
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          @click="page -= 1"
        >
          {{ t('bookings.previous') }}
        </button>
        <span>{{ t('bookings.pager', { from: String(meta.from ?? 0), to: String(meta.to ?? 0), total: String(meta.total) }) }}</span>
        <button
          type="button"
          :disabled="meta.current_page >= meta.last_page"
          @click="page += 1"
        >
          {{ t('bookings.next') }}
        </button>
      </div>
    </div>

    <ConversationDrawer
      v-model:open="drawerOpen"
      :conversation-id="selectedId"
      :detail="selectedRow"
      @updated="applyConversation"
    />
  </div>
</template>
