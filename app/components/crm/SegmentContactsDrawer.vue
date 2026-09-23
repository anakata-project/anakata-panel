<script setup lang="ts">
import type { ContactFilters, ContactProfile, CrmContact, Paginated } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import ContactDrawer from './ContactDrawer.vue'

type ContactPage = Paginated<CrmContact> & {
  meta: Paginated<CrmContact>['meta'] & {
    filters: ContactFilters
  }
}

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  segmentKey: string | null
  segmentName: string
}>()

const { t } = useI18n()
const { request } = useApi()

const page = ref(1)
const rows = ref<Paginated<CrmContact> | null>(null)
const error = ref('')
const loading = ref(false)
const filters = ref<ContactFilters | null>(null)
const contactOpen = ref(false)
const selected = ref<ContactProfile | null>(null)
const meta = computed(() => rows.value?.meta)
const typeOptions = computed(() => filters.value?.type ?? [])
const lifecycleOptions = computed(() => filters.value?.lifecycle ?? [])

async function loadFilters(): Promise<void> {
  if (filters.value) {
    return
  }

  const payload = await request('/api/crm/contacts?per_page=1') as ContactPage
  filters.value = payload.meta.filters
}

async function load(): Promise<void> {
  if (props.segmentKey === null) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const key = encodeURIComponent(props.segmentKey)
    const params = new URLSearchParams({
      page: String(page.value),
      per_page: '50'
    })
    rows.value = await request(`/api/crm/segments/${key}/contacts?${params.toString()}`) as Paginated<CrmContact>
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmSegments.failed')
  } finally {
    loading.value = false
  }
}

async function show(): Promise<void> {
  if (page.value !== 1) {
    page.value = 1
    return
  }

  await Promise.all([loadFilters().catch(() => undefined), load()])
}

watch(open, (isOpen) => {
  if (isOpen) {
    void show()
  }
})

watch(page, () => {
  if (open.value) {
    void load()
  }
})

async function openContact(id: number): Promise<void> {
  try {
    await loadFilters()
    selected.value = await request(`/api/crm/contacts/${String(id)}`) as ContactProfile
    contactOpen.value = true
    error.value = ''
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmSegments.failed')
  }
}

function onUpdated(profile: ContactProfile): void {
  selected.value = profile
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="segmentName"
  >
    <template #body>
      <p
        v-if="error"
        class="warnbox"
      >
        {{ error }}
      </p>
      <p
        v-else-if="!loading && (rows === null || rows.data.length === 0)"
        class="crm-held"
      >
        {{ t('crmSegments.emptyContacts') }}
      </p>
      <div
        v-else-if="rows"
        class="bk-table-wrap"
      >
        <p
          v-if="meta"
          class="crm-hint"
        >
          {{ t('crmSegments.listTotal', { total: meta.total }) }}
        </p>
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmContacts.colName') }}</th>
              <th>{{ t('crmContacts.email') }}</th>
              <th>{{ t('crmContacts.colCountry') }}</th>
              <th>{{ t('crmContacts.colLifecycle') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows.data"
              :key="row.id"
              class="bk-row"
              @click="openContact(row.id)"
            >
              <td>{{ row.name }}</td>
              <td>{{ row.email ?? '—' }}</td>
              <td>{{ row.country ?? '—' }}</td>
              <td>{{ row.lifecycle }}</td>
            </tr>
          </tbody>
        </table>
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
      <ContactDrawer
        v-model:open="contactOpen"
        :profile="selected"
        :type-options="typeOptions"
        :lifecycle-options="lifecycleOptions"
        @updated="onUpdated"
        @open-contact="openContact"
      />
    </template>
  </USlideover>
</template>
