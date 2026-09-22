<script setup lang="ts">
import type { DeliveryKpis, DeliveryRow } from '../../../types/api'
import { deliveryStatusClass } from '../../../components/crm/campaignHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

const KINDS = [
  'INVOICE',
  'FINAL_INVOICE',
  'SUMMARY',
  'RECEIPT',
  'REMINDER',
  'VOUCHER',
  'PRETRIP',
  'PAYMENT_LINK',
  'WIRE_INSTRUCTIONS'
] as const

const STATUSES = ['QUEUED', 'SENT', 'FAILED', 'BLOCKED'] as const

type DeliveryPayload = {
  data: Array<DeliveryRow>
  meta: {
    kpis: DeliveryKpis
    notes: {
      engagement: string
    }
    total: number
  }
}

const emptyKpis: DeliveryKpis = {
  sent_today: 0,
  failed: 0,
  blocked: 0,
  queued_over_15_minutes: 0
}

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()

const rows = ref<Array<DeliveryRow>>([])
const kpis = ref<DeliveryKpis>(emptyKpis)
const engagement = ref('')
const loadError = ref('')
const status = ref('')
const kind = ref('')
const from = ref('')
const to = ref('')
const booking = ref('')

onMounted(() => {
  void load()
})

watch([status, kind, from, to, booking], () => {
  void load()
})

async function load(): Promise<void> {
  const params = new URLSearchParams()

  if (status.value !== '') {
    params.set('status', status.value)
  }

  if (kind.value !== '') {
    params.set('kind', kind.value)
  }

  if (from.value !== '') {
    params.set('from', from.value)
  }

  if (to.value !== '') {
    params.set('to', to.value)
  }

  if (booking.value.trim() !== '') {
    params.set('booking', booking.value.trim())
  }

  const query = params.toString()

  try {
    const payload = await request(query === '' ? '/api/crm/deliveries' : `/api/crm/deliveries?${query}`) as DeliveryPayload
    rows.value = payload.data
    kpis.value = payload.meta.kpis
    engagement.value = payload.meta.notes.engagement
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmDelivery.failed')
  }
}
</script>

<template>
  <div>
    <p class="notice crm-notice">
      {{ t('crmDelivery.notice') }}
    </p>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>
    <div class="krow">
      <AnkKpi
        :label="t('crmDelivery.kpiSent')"
        :sub="t('crmDelivery.kpiSentSub')"
      >
        {{ kpis.sent_today }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmDelivery.kpiFailed')"
        :sub="t('crmDelivery.kpiFailedSub')"
      >
        <span class="crm-kpi-alert">{{ kpis.failed }}</span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmDelivery.kpiBlocked')"
        :sub="t('crmDelivery.kpiBlockedSub')"
      >
        {{ kpis.blocked }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmDelivery.kpiQueued')"
        :sub="t('crmDelivery.kpiQueuedSub')"
      >
        {{ kpis.queued_over_15_minutes }}
      </AnkKpi>
    </div>
    <p
      v-if="engagement"
      class="crm-hint"
    >
      {{ engagement }}
    </p>

    <div class="panel">
      <div class="ebtool dep-toolbar">
        <select v-model="status">
          <option value="">
            {{ t('crmDelivery.statusAll') }}
          </option>
          <option
            v-for="item in STATUSES"
            :key="item"
            :value="item"
          >
            {{ item }}
          </option>
        </select>
        <select v-model="kind">
          <option value="">
            {{ t('crmDelivery.kindAll') }}
          </option>
          <option
            v-for="item in KINDS"
            :key="item"
            :value="item"
          >
            {{ t(`crmDelivery.kinds.${item}`) }}
          </option>
        </select>
        <input
          v-model="from"
          type="date"
          :aria-label="t('crmDelivery.from')"
        >
        <input
          v-model="to"
          type="date"
          :aria-label="t('crmDelivery.to')"
        >
        <input
          v-model="booking"
          type="search"
          :placeholder="t('crmDelivery.booking')"
        >
      </div>
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('crmDelivery.booking') }}</th>
            <th>{{ t('crmDelivery.client') }}</th>
            <th>{{ t('crmDelivery.document') }}</th>
            <th>{{ t('crmDelivery.channel') }}</th>
            <th>{{ t('crmDelivery.status') }}</th>
            <th>{{ t('crmDelivery.triggered') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="7">
              {{ t('crmDelivery.empty') }}
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
          >
            <td class="nw">
              {{ row.booking.reference ?? '—' }}
            </td>
            <td>{{ row.client ?? '—' }}</td>
            <td>
              <template v-if="row.document">
                {{ row.document.label }}
                <span class="sysbadge sys-rms">{{ t('crmDelivery.rmsRendered') }}</span>
                <span class="crm-held">v{{ row.document.version }}<template v-if="row.document.reason"> · {{ row.document.reason }}</template></span>
              </template>
              <template v-else>
                {{ row.delivery_kind_label }}
              </template>
              <span
                v-if="row.superseded"
                class="pill new"
              >{{ t('crmDelivery.superseded') }}</span>
            </td>
            <td>{{ row.channel }}</td>
            <td>
              <span
                class="pill"
                :class="deliveryStatusClass(row.status)"
              >{{ row.status }}</span>
              <span v-if="row.at">{{ format(row.at, 'dateTime') }}</span>
              <span
                v-if="row.detail"
                class="crm-held"
              >{{ row.detail }}</span>
            </td>
            <td>{{ row.triggered_by }}</td>
            <td>
              <NuxtLink
                class="lnk"
                :to="row.rms_path"
              >
                {{ t('crmDelivery.openRms') }}
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
      <p class="crm-hint">
        {{ t('crmDelivery.hint') }}
      </p>
    </div>
  </div>
</template>
