<script setup lang="ts">
import type { Booking, CharterEnquiry, CharterEnquiryStatus, IssuedDocument } from '../../types/api'
import BookingPanel from '../bookings/BookingPanel.vue'
import DocumentPreviewModal from '../documents/DocumentPreviewModal.vue'
import ReasonModal from '../bookings/ReasonModal.vue'
import { charterActions } from './charterActions'
import { firstApiMessage } from '../../utils/apiForm'

const STATUSES: Array<CharterEnquiryStatus> = ['NEW', 'CONTACTED', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CLOSED']

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format } = useDates()
const toast = useToast()

const canUpdate = computed(() => can('bookings.create'))
const statusFilter = ref<CharterEnquiryStatus | ''>('')
const listUrl = computed(() => {
  return statusFilter.value === ''
    ? '/api/rms/charter-enquiries'
    : `/api/rms/charter-enquiries?status=${statusFilter.value}`
})

const { data: listPayload, refresh } = useFetch<{ data: Array<CharterEnquiry> }>(listUrl)
const rows = computed(() => listPayload.value?.data ?? [])

const selected = ref<CharterEnquiry | null>(null)
const drawerOpen = ref(false)
const issued = ref<IssuedDocument | null>(null)
const reissueReason = ref('')
const posting = ref(false)
const actionError = ref('')

const reasonOpen = ref(false)
const reasonMode = ref<'DECLINED' | 'CLOSED'>('DECLINED')
const reasonError = ref('')

const previewOpen = ref(false)
const bookingOpen = ref(false)
const booking = ref<Booking | null>(null)

const flags = computed(() => {
  if (selected.value === null) {
    return charterActions('CLOSED', true)
  }

  return charterActions(selected.value.status, selected.value.booking !== null)
})

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

  return t('charterEnquiries.noProposal')
}

function proposalLabel(row: CharterEnquiry): string {
  if (row.proposal === null) {
    return t('charterEnquiries.noProposal')
  }

  return t('charterEnquiries.proposalLine', {
    version: row.proposal.version,
    state: row.proposal.state
  })
}

function openRow(row: CharterEnquiry): void {
  selected.value = row
  issued.value = null
  reissueReason.value = ''
  actionError.value = ''
  drawerOpen.value = true
}

const statusItems = computed(() => [
  { label: t('charterEnquiries.allStatuses'), value: '' },
  ...STATUSES.map(status => ({
    label: t(`charterEnquiries.status.${status}`),
    value: status
  }))
])

async function patchStatus(status: 'CONTACTED' | 'DECLINED' | 'CLOSED', reason?: string): Promise<void> {
  if (selected.value === null) {
    return
  }

  posting.value = true
  actionError.value = ''

  try {
    const updated = await request(`/api/rms/charter-enquiries/${String(selected.value.id)}`, {
      method: 'PATCH',
      body: reason === undefined ? { status } : { status, reason }
    }) as CharterEnquiry

    selected.value = updated
    toast.add({
      title: status === 'CONTACTED'
        ? t('charterEnquiries.contactedToast')
        : status === 'DECLINED'
          ? t('charterEnquiries.declinedToast')
          : t('charterEnquiries.closedToast')
    })
    await refresh()
  } catch (error: unknown) {
    actionError.value = firstApiMessage(error) ?? ''
    throw error
  } finally {
    posting.value = false
  }
}

async function markContacted(): Promise<void> {
  try {
    await patchStatus('CONTACTED')
  } catch {
    // The drawer shows actionError.
  }
}

function startReason(mode: 'DECLINED' | 'CLOSED'): void {
  reasonMode.value = mode
  reasonError.value = ''
  reasonOpen.value = true
}

async function onReason(reason: string): Promise<void> {
  try {
    await patchStatus(reasonMode.value, reason)
    reasonOpen.value = false
  } catch (error: unknown) {
    reasonError.value = firstApiMessage(error) ?? ''
  }
}

async function issue(): Promise<void> {
  if (selected.value === null) {
    return
  }

  if (selected.value.status === 'QUOTED' && reissueReason.value.trim() === '') {
    actionError.value = t('charterEnquiries.reissueReason')

    return
  }

  posting.value = true
  actionError.value = ''

  try {
    const document = await request(`/api/rms/charter-enquiries/${String(selected.value.id)}/proposal`, {
      method: 'POST',
      body: selected.value.status === 'QUOTED' ? { reason: reissueReason.value.trim() } : {}
    }) as IssuedDocument

    issued.value = document
    previewOpen.value = true
    toast.add({ title: t('charterEnquiries.issuedToast') })
    await refresh()
    const fresh = rows.value.find(row => row.id === selected.value?.id)
    if (fresh !== undefined) {
      selected.value = fresh
    }
  } catch (error: unknown) {
    actionError.value = firstApiMessage(error) ?? ''
  } finally {
    posting.value = false
  }
}

async function sendProposal(): Promise<void> {
  if (issued.value === null) {
    return
  }

  posting.value = true
  actionError.value = ''

  try {
    await request(`/api/rms/documents/${String(issued.value.id)}/send`, { method: 'POST' })
    toast.add({ title: t('charterEnquiries.sentToast') })
  } catch (error: unknown) {
    actionError.value = firstApiMessage(error) ?? ''
  } finally {
    posting.value = false
  }
}

async function openBooking(id: number): Promise<void> {
  booking.value = await request(`/api/rms/bookings/${String(id)}`) as Booking
  bookingOpen.value = true
}
</script>

<template>
  <div class="panel">
    <div class="bk-toolbar">
      <h3>{{ t('charterEnquiries.title') }}</h3>
      <USelect
        v-model="statusFilter"
        size="sm"
        :items="statusItems"
        :aria-label="t('charterEnquiries.allStatuses')"
      />
    </div>
    <div class="bk-table-wrap">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('charterEnquiries.colReceived') }}</th>
            <th>{{ t('charterEnquiries.colContact') }}</th>
            <th>{{ t('charterEnquiries.colDates') }}</th>
            <th>{{ t('charterEnquiries.colGuests') }}</th>
            <th>{{ t('charterEnquiries.colStatus') }}</th>
            <th>{{ t('charterEnquiries.colProposal') }}</th>
            <th>{{ t('charterEnquiries.colBooking') }}</th>
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
              <button
                type="button"
                class="lnk"
                @click="openRow(row)"
              >
                {{ row.created_at === null ? t('charterEnquiries.noProposal') : format(row.created_at, 'short') }}
              </button>
            </td>
            <td>
              {{ row.contact.name }}
              <div
                v-if="row.contact.email"
                class="bk-sub"
              >
                {{ row.contact.email }}
              </div>
            </td>
            <td>{{ datesLabel(row) }}</td>
            <td>{{ row.guests }}</td>
            <td>
              <span class="pill">{{ t(`charterEnquiries.status.${row.status}`) }}</span>
              <span
                v-if="row.sla_breached"
                class="pill p-over"
              >{{ t('charterEnquiries.sla') }}</span>
            </td>
            <td>
              {{ proposalLabel(row) }}
              <div
                v-if="row.proposal !== null && typeof row.proposal.valid_until === 'string'"
                class="bk-sub"
              >
                {{ t('charterEnquiries.validUntil', { date: format(row.proposal.valid_until, 'short') }) }}
              </div>
            </td>
            <td>
              <button
                v-if="row.booking !== null"
                type="button"
                class="lnk"
                @click="openBooking(row.booking.id)"
              >
                {{ row.booking.reference }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <USlideover
      :open="drawerOpen"
      @update:open="drawerOpen = $event"
    >
      <template #body>
        <template v-if="selected">
          <h2>{{ selected.contact.name }}</h2>
          <p>{{ selected.message }}</p>
          <p class="mono">
            {{ datesLabel(selected) }} · {{ selected.guests }}
          </p>
          <p>
            <span class="pill">{{ t(`charterEnquiries.status.${selected.status}`) }}</span>
            <span
              v-if="selected.sla_breached"
              class="pill p-over"
            >{{ t('charterEnquiries.sla') }}</span>
          </p>
          <p v-if="selected.proposal">
            {{ proposalLabel(selected) }}
            <span v-if="selected.proposal.number"> · {{ selected.proposal.number }}</span>
          </p>
          <div v-if="selected.status === 'ACCEPTED'">
            <h3>{{ t('charterEnquiries.acceptedTitle') }}</h3>
            <p v-if="selected.proposal">
              {{ t('charterEnquiries.acceptedVersion', { version: selected.proposal.version }) }}
              · {{ selected.proposal.state }}
            </p>
            <button
              v-if="selected.booking !== null"
              type="button"
              class="lnk"
              @click="openBooking(selected.booking.id)"
            >
              {{ selected.booking.reference }}
            </button>
          </div>
          <p
            v-if="actionError !== ''"
            class="notice"
          >
            {{ actionError }}
          </p>
          <label v-if="flags.issue && selected.status === 'QUOTED'">
            {{ t('charterEnquiries.reissueReason') }}
            <input
              v-model="reissueReason"
              type="text"
            >
          </label>
          <div
            v-if="canUpdate"
            class="list-actions"
          >
            <UButton
              v-if="flags.contacted"
              :disabled="posting"
              @click="markContacted"
            >
              {{ t('charterEnquiries.markContacted') }}
            </UButton>
            <UButton
              v-if="flags.issue"
              :disabled="posting"
              @click="issue"
            >
              {{ t('charterEnquiries.issue') }}
            </UButton>
            <UButton
              v-if="issued !== null"
              :disabled="posting"
              @click="sendProposal"
            >
              {{ t('charterEnquiries.send') }}
            </UButton>
            <UButton
              v-if="flags.decline"
              variant="outline"
              :disabled="posting"
              @click="startReason('DECLINED')"
            >
              {{ t('charterEnquiries.decline') }}
            </UButton>
            <UButton
              v-if="flags.close"
              variant="outline"
              :disabled="posting"
              @click="startReason('CLOSED')"
            >
              {{ t('charterEnquiries.close') }}
            </UButton>
          </div>
        </template>
      </template>
    </USlideover>

    <DocumentPreviewModal
      v-model:open="previewOpen"
      :title="issued?.number ?? t('charterEnquiries.issue')"
      :html-path="issued === null ? null : `/api/rms/documents/${String(issued.id)}/html`"
      :file-path="issued === null ? null : `/api/rms/documents/${String(issued.id)}/file`"
      :file-name="issued?.number ?? 'proposal'"
    />

    <ReasonModal
      v-model:open="reasonOpen"
      :title="reasonMode === 'DECLINED' ? t('charterEnquiries.declineTitle') : t('charterEnquiries.closeTitle')"
      hint="required"
      :submitting="posting"
      :error="reasonError"
      @submit="onReason"
    />

    <BookingPanel
      v-model:open="bookingOpen"
      :booking="booking"
      :business-day-minutes="0"
    />
  </div>
</template>
