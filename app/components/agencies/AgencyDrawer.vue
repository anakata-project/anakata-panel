<script setup lang="ts">
import type { Agency, Booking } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { agencyStatusPill, countryName } from './agencyHelpers'
import { statusLabel, statusPillClass } from '../bookings/bookingHelpers'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  agency: Agency | null
  capPct: number
}>()

const emit = defineEmits<{
  saved: [agency: Agency]
  openBooking: [id: number]
}>()

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const name = ref('')
const contact = ref('')
const network = ref('')
const terms = ref('')
const commission = ref(0)
const snapshot = ref('')
const warn = ref('')
const saving = ref(false)

const canManage = computed(() => can('agencies.manage'))

const dirty = computed(() => {
  return `${name.value}\0${contact.value}\0${network.value}\0${terms.value}\0${String(commission.value)}` !== snapshot.value
})

watch(
  () => [open.value, props.agency] as const,
  ([isOpen, agency]) => {
    if (!isOpen || agency === null) {
      return
    }

    name.value = agency.name
    contact.value = agency.contact
    network.value = agency.network ?? ''
    terms.value = agency.payment_terms
    commission.value = agency.commission_pct
    snapshot.value = `${agency.name}\0${agency.contact}\0${agency.network ?? ''}\0${agency.payment_terms}\0${String(agency.commission_pct)}`
    warn.value = ''
  }
)

async function save(): Promise<void> {
  if (props.agency === null) {
    return
  }

  saving.value = true
  warn.value = ''

  try {
    const updated = await request(`/api/rms/agencies/${String(props.agency.id)}`, {
      method: 'PATCH',
      body: {
        name: name.value.trim(),
        contact: contact.value.trim(),
        network: network.value.trim(),
        payment_terms: terms.value.trim(),
        commission_pct: commission.value
      }
    }) as Agency

    snapshot.value = `${updated.name}\0${updated.contact}\0${updated.network ?? ''}\0${updated.payment_terms}\0${String(updated.commission_pct)}`
    toast.add({ title: t('agencies.savedToast') })
    emit('saved', updated)
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    saving.value = false
  }
}

function userStatus(status: string): string {
  if (status === 'PENDING' || status === 'INVITED' || status === 'ACTIVE' || status === 'DISABLED') {
    return t(`agencies.userStatus.${status}`)
  }

  return status
}

function decidedLabel(agency: Agency): string {
  if (agency.decided_at === null) {
    return '—'
  }

  const when = format(agency.decided_at, 'short')
  const who = agency.decided_by?.name ?? ''

  return who === '' ? when : `${when} · ${who}`
}
</script>

<template>
  <USlideover
    :open="open"
    class="history-drawer"
    @update:open="open = $event"
  >
    <template #header>
      <div v-if="agency">
        <h2>{{ agency.name }}</h2>
        <div class="bid">
          {{ agency.reference }}
          ·
          {{ agency.network ?? '—' }}
          ·
          <span
            class="pill"
            :class="agencyStatusPill(agency.status)"
          >{{ agency.status }}</span>
        </div>
      </div>
    </template>

    <template #body>
      <template v-if="agency">
        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>

        <div class="kv">
          <span>{{ t('agencies.contact') }}</span>
          <span>{{ agency.contact }} · {{ agency.email }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.country') }}</span>
          <span>{{ countryName(agency.country) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.commissionPct') }}</span>
          <span>
            {{ agency.commission_pct }}%
            <template v-if="agency.commission_pct > capPct">
              {{ t('agencies.capHold', { cap: String(capPct) }) }}
            </template>
          </span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.paymentTerms') }}</span>
          <span>{{ agency.payment_terms }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.colRequested') }}</span>
          <span>{{ t('agencies.registrationLine', {
            requested: agency.requested_at === null ? '—' : format(agency.requested_at, 'short'),
            decided: decidedLabel(agency)
          }) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.colRevenue') }}</span>
          <span>{{ money(agency.revenue) }} · {{ agency.bookings_count }} · {{ money(agency.commission_accrued) }}</span>
        </div>

        <div class="sec">
          <h4>{{ t('agencies.usersTitle') }}</h4>
          <div
            v-for="user in agency.users"
            :key="user.id"
            class="kv"
          >
            <span>{{ user.name }} · {{ user.email }}</span>
            <span>{{ userStatus(user.status) }}</span>
          </div>
        </div>

        <div class="sec">
          <h4>{{ t('agencies.bookingsTitle') }}</h4>
          <table class="list mini-t">
            <thead>
              <tr>
                <th>{{ t('payments.colBooking') }}</th>
                <th>{{ t('payments.colClient') }}</th>
                <th>{{ t('payments.colDate') }}</th>
                <th>{{ t('payments.colStatus') }}</th>
                <th>{{ t('payments.colCommission') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="agency.bookings.length === 0"
                class="dr-empty"
              >
                <td colspan="5">
                  {{ t('agencies.noBookings') }}
                </td>
              </tr>
              <tr
                v-for="row in agency.bookings"
                :key="row.id"
                class="bk-row"
                @click="emit('openBooking', row.id)"
              >
                <td class="bk-ref">
                  {{ row.reference }}
                </td>
                <td>{{ row.client }}</td>
                <td>{{ format(row.departure_date, 'short') }}</td>
                <td>
                  <span
                    class="pill"
                    :class="statusPillClass(row.status as Booking['status'])"
                  >{{ statusLabel(row.status as Booking['status']) }}</span>
                </td>
                <td>{{ money(row.commission_amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="canManage"
          class="sec"
        >
          <h4>{{ t('agencies.save') }}</h4>
          <div class="field">
            <label for="ag-name">{{ t('agencies.name') }}</label>
            <input
              id="ag-name"
              v-model="name"
            >
          </div>
          <div class="field">
            <label for="ag-contact">{{ t('agencies.contact') }}</label>
            <input
              id="ag-contact"
              v-model="contact"
            >
          </div>
          <div class="field">
            <label for="ag-network">{{ t('agencies.network') }}</label>
            <input
              id="ag-network"
              v-model="network"
            >
          </div>
          <div class="field">
            <label for="ag-terms">{{ t('agencies.paymentTerms') }}</label>
            <input
              id="ag-terms"
              v-model="terms"
            >
          </div>
          <div class="field">
            <label for="ag-comm">{{ t('agencies.commissionPct') }}</label>
            <input
              id="ag-comm"
              v-model.number="commission"
              type="number"
              min="0"
              max="30"
            >
          </div>
          <UButton
            :disabled="saving || !dirty"
            :loading="saving"
            @click="save"
          >
            {{ t('agencies.save') }}
          </UButton>
        </div>

        <div class="sec">
          <h4>{{ t('agencies.previewTitle', { name: agency.name }) }}</h4>
          <p class="notice">
            {{ t('agencies.previewNotice') }}
          </p>
          <div class="prevbox">
            <div class="mono prevl">
              {{ t('agencies.previewRates', { pct: String(agency.portal_preview.commission_pct) }) }}
            </div>
            <table class="list mini-t">
              <thead>
                <tr>
                  <th>{{ t('agencies.netRate') }}</th>
                  <th
                    v-for="year in agency.portal_preview.net_rates"
                    :key="year.year"
                  >
                    {{ year.year }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ t('agencies.suitePp') }}</td>
                  <td
                    v-for="year in agency.portal_preview.net_rates"
                    :key="`s-${year.year}`"
                  >
                    {{ money(year.suite_pp) }}
                  </td>
                </tr>
                <tr>
                  <td>{{ t('agencies.ownerPp') }}</td>
                  <td
                    v-for="year in agency.portal_preview.net_rates"
                    :key="`o-${year.year}`"
                  >
                    {{ money(year.owner_pp) }}
                  </td>
                </tr>
                <tr>
                  <td>{{ t('agencies.charterWeek') }}</td>
                  <td
                    v-for="year in agency.portal_preview.net_rates"
                    :key="`c-${year.year}`"
                  >
                    {{ money(year.charter_week) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="mono prevl">
              {{ t('agencies.previewBookings') }}
            </div>
            <table class="list mini-t">
              <thead>
                <tr>
                  <th>{{ t('payments.colBooking') }}</th>
                  <th>{{ t('payments.colClient') }}</th>
                  <th>{{ t('payments.colStatus') }}</th>
                  <th>{{ t('payments.colCommission') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="agency.bookings.length === 0"
                  class="dr-empty"
                >
                  <td colspan="4">
                    {{ t('agencies.noBookings') }}
                  </td>
                </tr>
                <tr
                  v-for="row in agency.bookings"
                  :key="`p-${row.id}`"
                >
                  <td class="bk-ref">
                    {{ row.reference }}
                  </td>
                  <td>{{ row.client }}</td>
                  <td>{{ row.status }}</td>
                  <td>{{ money(row.commission_amount) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="mono prevl">
              {{ t('agencies.previewCommissions') }}
            </div>
            <table class="list mini-t">
              <thead>
                <tr>
                  <th>{{ t('payments.colBooking') }}</th>
                  <th>{{ t('payments.colRate') }}</th>
                  <th>{{ t('payments.colCommission') }}</th>
                  <th>{{ t('payments.colStatus') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="agency.bookings.length === 0"
                  class="dr-empty"
                >
                  <td colspan="4">
                    {{ t('agencies.noBookings') }}
                  </td>
                </tr>
                <tr
                  v-for="row in agency.bookings"
                  :key="`c-${row.id}`"
                >
                  <td class="bk-ref">
                    {{ row.reference }}
                  </td>
                  <td>{{ row.commission_pct === null ? '—' : `${String(row.commission_pct)}%` }}</td>
                  <td>{{ money(row.commission_amount) }}</td>
                  <td>
                    <span
                      class="pill"
                      :class="row.commission_approved ? 'p-wait' : 'p-over'"
                    >{{ row.commission_approved ? t('payments.commissionAccrued') : t('agencies.blockedAccrued') }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="mono prevl">
              {{ t('agencies.previewMaterials') }}
            </div>
            <div class="gmeta">
              {{ t('agencies.previewMaterialsBody') }}
            </div>
          </div>
        </div>
      </template>
    </template>
  </USlideover>
</template>
