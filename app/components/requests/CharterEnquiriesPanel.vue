<script setup lang="ts">
import type { CharterEnquiry, CharterEnquiryStatus } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format } = useDates()
const toast = useToast()

const canUpdate = computed(() => can('bookings.create'))
const { data: listPayload, refresh } = useFetch<{ data: Array<CharterEnquiry> }>('/api/rms/charter-enquiries')
const rows = computed(() => listPayload.value?.data ?? [])
const updating = ref<number | null>(null)

function nextStatus(status: CharterEnquiryStatus): CharterEnquiryStatus | null {
  if (status === 'NEW') {
    return 'CONTACTED'
  }

  if (status === 'CONTACTED') {
    return 'CLOSED'
  }

  return null
}

function datesLabel(row: CharterEnquiry): string {
  if (row.departure !== null) {
    return t('charterEnquiries.departureDate', { date: format(row.departure.date, 'short') })
  }

  if (row.preferred_from !== null || row.preferred_to !== null) {
    return t('charterEnquiries.preferredDates', {
      from: row.preferred_from === null ? '…' : format(row.preferred_from, 'short'),
      to: row.preferred_to === null ? '…' : format(row.preferred_to, 'short')
    })
  }

  return '—'
}

function nextLabel(status: CharterEnquiryStatus): string {
  return status === 'NEW' ? t('charterEnquiries.markContacted') : t('charterEnquiries.markClosed')
}

async function advance(row: CharterEnquiry): Promise<void> {
  const status = nextStatus(row.status)

  if (status === null || !canUpdate.value) {
    return
  }

  updating.value = row.id

  try {
    await request(`/api/rms/charter-enquiries/${row.id}`, {
      method: 'PATCH',
      body: { status }
    })
    toast.add({
      title: status === 'CONTACTED'
        ? t('charterEnquiries.contactedToast')
        : t('charterEnquiries.closedToast')
    })
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: firstApiMessage(error) ?? (error instanceof Error ? error.message : '') })
  } finally {
    updating.value = null
  }
}
</script>

<template>
  <div class="panel">
    <h3>{{ t('charterEnquiries.title') }}</h3>
    <div class="bk-table-wrap">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('charterEnquiries.colReceived') }}</th>
            <th>{{ t('charterEnquiries.colContact') }}</th>
            <th>{{ t('charterEnquiries.colDates') }}</th>
            <th>{{ t('charterEnquiries.colGuests') }}</th>
            <th>{{ t('charterEnquiries.colMessage') }}</th>
            <th>{{ t('charterEnquiries.colStatus') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="rows.length === 0"
            class="dr-empty"
          >
            <td colspan="7">
              {{ t('charterEnquiries.empty') }}
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
          >
            <td class="nw">
              {{ row.created_at === null ? '—' : format(row.created_at, 'short') }}
            </td>
            <td>
              {{ row.contact.name }}
              <div
                v-if="row.contact.email"
                class="bk-sub"
              >
                {{ row.contact.email }}
              </div>
              <div
                v-if="row.contact.phone"
                class="bk-sub"
              >
                {{ row.contact.phone }}
              </div>
            </td>
            <td>{{ datesLabel(row) }}</td>
            <td>{{ row.guests }}</td>
            <td class="of-scope">
              {{ row.message }}
            </td>
            <td>
              <span class="pill">{{ t(`charterEnquiries.status.${row.status}`) }}</span>
            </td>
            <td class="list-actions">
              <UButton
                v-if="canUpdate && nextStatus(row.status) !== null"
                variant="outline"
                :loading="updating === row.id"
                @click="advance(row)"
              >
                {{ nextLabel(row.status) }}
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
