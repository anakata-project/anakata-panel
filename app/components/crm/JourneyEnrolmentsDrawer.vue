<script setup lang="ts">
import type { JourneyEnrolment, Paginated } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  journeyKey: string | null
  journeyName: string
}>()

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()

const page = ref(1)
const rows = ref<Paginated<JourneyEnrolment> | null>(null)
const error = ref('')
const loading = ref(false)
const canRms = computed(() => can('panel.rms'))
const meta = computed(() => rows.value?.meta)

async function load(): Promise<void> {
  if (props.journeyKey === null) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const key = encodeURIComponent(props.journeyKey)
    rows.value = await request(`/api/crm/journeys/${key}/enrolments?page=${String(page.value)}`) as Paginated<JourneyEnrolment>
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmJourneys.failed')
  } finally {
    loading.value = false
  }
}

async function show(): Promise<void> {
  if (page.value !== 1) {
    page.value = 1
    return
  }

  await load()
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

function contactHref(id: number): string {
  return `/crm/sales/contacts?open=${String(id)}`
}

function bookingHref(reference: string | null): string | null {
  if (!canRms.value || reference === null || reference === '') {
    return null
  }

  return `/rms/reservations/bookings?open=${encodeURIComponent(reference)}`
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="journeyName"
  >
    <template #body>
      <h2>{{ t('crmJourneys.enrolments') }}</h2>
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
        {{ t('crmJourneys.noEnrolments') }}
      </p>
      <div
        v-else-if="rows"
        class="bk-table-wrap"
      >
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmJourneys.colContact') }}</th>
              <th>{{ t('crmJourneys.colBooking') }}</th>
              <th>{{ t('crmJourneys.colStep') }}</th>
              <th>{{ t('crmJourneys.colDue') }}</th>
              <th>{{ t('crmJourneys.colStatus') }}</th>
              <th>{{ t('crmJourneys.colExit') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows.data"
              :key="row.id"
            >
              <td>
                <NuxtLink :to="contactHref(row.contact.id)">
                  {{ row.contact.name }}
                </NuxtLink>
              </td>
              <td>
                <NuxtLink
                  v-if="bookingHref(row.booking?.reference ?? null)"
                  :to="bookingHref(row.booking?.reference ?? null) ?? ''"
                >
                  {{ row.booking?.reference }}
                </NuxtLink>
                <template v-else>
                  {{ row.booking?.reference ?? '—' }}
                </template>
              </td>
              <td>{{ row.step?.name ?? '—' }}</td>
              <td class="nw">
                {{ format(row.next_due_at, 'dateTime') }}
              </td>
              <td>
                <span class="pill">{{ row.status }}</span>
              </td>
              <td>{{ row.exit_reason ?? '—' }}</td>
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
    </template>
  </USlideover>
</template>
