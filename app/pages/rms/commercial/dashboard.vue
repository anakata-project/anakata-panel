<script setup lang="ts">
import type {
  AgencyListItem,
  BusinessRulesVersion,
  ChannelOfOriginGroup,
  CommercialMetrics,
  ItineraryListItem,
  MetricDefinition,
  Yacht
} from '../../../types/api'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import { calendarYear, resolveDateRange } from '../../../components/lists/dateRange'
import {
  occupancyBarWidth,
  occupancyIsLow,
  ratioPercentLabel
} from '../../../components/commercial/dashboardHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

const CHANNELS: Array<ChannelOfOriginGroup> = [
  'Direct',
  'Marketing',
  'Trade, corporate & groups',
  'Distribution, partners & other'
]

const FILTER_DEBOUNCE_MS = 300

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()

const today = computed(() => format(new Date(), 'iso'))
const yearWindow = resolveDateRange(`y${calendarYear(today.value)}`, today.value)
const from = ref<string | null>(yearWindow.from)
const to = ref<string | null>(yearWindow.to)
const yachtId = ref<number | null>(null)
const itineraryId = ref<number | null>(null)
const channel = ref<ChannelOfOriginGroup | ''>('')
const agencyId = ref<number | null>(null)

const metrics = ref<CommercialMetrics | null>(null)
const loadError = ref('')

const { data: yachtsPayload } = useFetch<{ data: Array<Yacht> }>('/api/rms/yachts')
const { data: itinerariesPayload } = useFetch<{ data: Array<ItineraryListItem> }>('/api/rms/itineraries')
const { data: agenciesPayload } = useFetch<{ data: Array<AgencyListItem> }>('/api/rms/agencies')
const { data: rulesPayload } = useFetch<BusinessRulesVersion>('/api/rms/business-rules', {
  immediate: can('rules.view')
})

const yachts = computed(() => yachtsPayload.value?.data ?? [])
const itineraries = computed(() => itinerariesPayload.value?.data ?? [])
const agencies = computed(() => agenciesPayload.value?.data ?? [])
const lowOccupancyPct = computed(() => rulesPayload.value?.document.alerts.low_occupancy_pct ?? null)
const departureCount = computed(() => metrics.value?.metrics.occupancy.departures.length ?? 0)
const hasWindow = computed(() => from.value !== null && to.value !== null)

const yachtItems = computed(() => [
  { label: t('dashboard.allYachts'), value: null as number | null },
  ...yachts.value.map(yacht => ({
    label: yacht.code,
    value: yacht.id
  }))
])

const itineraryItems = computed(() => [
  { label: t('dashboard.allItineraries'), value: null as number | null },
  ...itineraries.value.map(itinerary => ({
    label: itinerary.name,
    value: itinerary.id
  }))
])

const channelItems = computed(() => [
  { label: t('dashboard.allChannels'), value: '' as ChannelOfOriginGroup | '' },
  ...CHANNELS.map(group => ({
    label: group,
    value: group
  }))
])

const agencyItems = computed(() => [
  { label: t('dashboard.allAgencies'), value: null as number | null },
  ...agencies.value.map(agency => ({
    label: agency.name,
    value: agency.id
  }))
])

let filterTimer: ReturnType<typeof setTimeout> | undefined

watch([from, to, yachtId, itineraryId, channel, agencyId], () => {
  metrics.value = null
  clearTimeout(filterTimer)
  filterTimer = setTimeout(() => {
    void loadMetrics()
  }, FILTER_DEBOUNCE_MS)
}, { immediate: true })

onUnmounted(() => {
  clearTimeout(filterTimer)
})

function definitionLine(definition: MetricDefinition): string {
  return t('dashboard.definition', {
    sentence: definition.sentence,
    filters: definition.filters_on,
    excludes: definition.excludes
  })
}

function percentOrDash(ratio: string | null): string {
  return ratioPercentLabel(ratio) ?? t('dashboard.dash')
}

function moneyOrDash(value: number | null): string {
  if (value === null) {
    return t('dashboard.dash')
  }

  return money(value)
}

function daysOrDash(value: string | null): string {
  if (value === null) {
    return t('dashboard.dash')
  }

  return t('dashboard.kpiLeadDays', { days: value })
}

function shareOrDash(value: number | null): string {
  if (value === null || value === 0) {
    return t('dashboard.dash')
  }

  return `${String(value)}%`
}

function barColor(ratio: string | null): string {
  return occupancyIsLow(ratio, lowOccupancyPct.value) ? 'var(--coral)' : 'var(--sand)'
}

async function loadMetrics(): Promise<void> {
  if (from.value === null || to.value === null) {
    metrics.value = null
    loadError.value = ''
    return
  }

  const params = new URLSearchParams({
    from: from.value,
    to: to.value
  })

  if (yachtId.value !== null) {
    params.set('yacht', String(yachtId.value))
  }

  if (itineraryId.value !== null) {
    params.set('itinerary', String(itineraryId.value))
  }

  if (channel.value !== '') {
    params.set('channel', channel.value)
  }

  if (agencyId.value !== null) {
    params.set('agency', String(agencyId.value))
  }

  try {
    metrics.value = await request(`/api/rms/metrics?${params.toString()}`) as CommercialMetrics
    loadError.value = ''
  } catch (error: unknown) {
    metrics.value = null
    loadError.value = firstApiMessage(error) ?? t('dashboard.loadError')
  }
}
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="t('dashboard.fieldLabel')"
      :noun="t('dashboard.noun')"
      :total="departureCount"
      :today="today"
    />

    <div class="drbar">
      <div class="drl">
        <span class="mono">{{ t('dashboard.filtersLabel') }}</span>
      </div>
      <USelect
        v-model="yachtId"
        size="sm"
        :items="yachtItems"
        :aria-label="t('dashboard.allYachts')"
      />
      <USelect
        v-model="itineraryId"
        size="sm"
        :items="itineraryItems"
        :aria-label="t('dashboard.allItineraries')"
      />
      <USelect
        v-model="channel"
        size="sm"
        :items="channelItems"
        :aria-label="t('dashboard.allChannels')"
      />
      <USelect
        v-model="agencyId"
        size="sm"
        :items="agencyItems"
        :aria-label="t('dashboard.allAgencies')"
      />
    </div>

    <p
      v-if="loadError !== ''"
      class="notice"
    >
      {{ loadError }}
    </p>
    <p
      v-else-if="!hasWindow"
      class="notice"
    >
      {{ t('dashboard.windowEmpty') }}
    </p>

    <template v-else-if="metrics">
      <div class="krow">
        <AnkKpi
          :label="t('dashboard.kpiOccupancy')"
          :sub="definitionLine(metrics.metrics.occupancy.definition)"
        >
          {{ percentOrDash(metrics.metrics.occupancy.occupancy) }}
        </AnkKpi>
        <AnkKpi
          :label="t('dashboard.kpiRevpab')"
          :sub="definitionLine(metrics.metrics.revpab.definition)"
        >
          {{ moneyOrDash(metrics.metrics.revpab.revpab) }}
        </AnkKpi>
        <AnkKpi
          :label="t('dashboard.kpiAdr')"
          :sub="definitionLine(metrics.metrics.adr.definition)"
        >
          {{ moneyOrDash(metrics.metrics.adr.adr) }}
        </AnkKpi>
        <AnkKpi
          :label="t('dashboard.kpiLead')"
          :sub="definitionLine(metrics.metrics.lead_time.definition)"
        >
          {{ daysOrDash(metrics.metrics.lead_time.average_days) }}
        </AnkKpi>
        <AnkKpi
          :label="t('dashboard.kpiNps')"
          :sub="definitionLine(metrics.metrics.nps.definition)"
        >
          {{ metrics.metrics.nps.average_score ?? t('dashboard.dash') }}
        </AnkKpi>
        <AnkKpi
          :label="t('dashboard.kpiCommissions')"
          :sub="definitionLine(metrics.metrics.commissions.definition)"
        >
          {{ money(metrics.metrics.commissions.payable) }}
        </AnkKpi>
      </div>

      <div class="panel">
        <h3>{{ t('dashboard.cashTitle') }}</h3>
        <p class="mono dash-def">
          {{ definitionLine(metrics.metrics.cash.definition) }}
        </p>
        <div class="krow">
          <AnkKpi :label="t('dashboard.kpiCollected')">
            {{ money(metrics.metrics.cash.collected) }}
          </AnkKpi>
          <AnkKpi :label="t('dashboard.kpiPending')">
            {{ money(metrics.metrics.cash.pending) }}
          </AnkKpi>
          <AnkKpi :label="t('dashboard.kpiOverdue')">
            <span class="pay-kpi-coral">{{ money(metrics.metrics.cash.overdue) }}</span>
          </AnkKpi>
          <AnkKpi :label="t('dashboard.kpiDepositShare')">
            {{ shareOrDash(metrics.metrics.cash.deposit_share_pct) }}
          </AnkKpi>
        </div>
      </div>

      <div class="panel">
        <h3>{{ t('dashboard.occupancyTitle') }}</h3>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th>{{ t('dashboard.colDate') }}</th>
                <th>{{ t('dashboard.colYacht') }}</th>
                <th>{{ t('dashboard.colSold') }}</th>
                <th>{{ t('dashboard.colSellable') }}</th>
                <th>{{ t('dashboard.colOccupancy') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="metrics.metrics.occupancy.departures.length === 0"
                class="dr-empty"
              >
                <td colspan="5">
                  {{ t('dashboard.occupancyEmpty') }}
                </td>
              </tr>
              <tr
                v-for="row in metrics.metrics.occupancy.departures"
                :key="row.id"
              >
                <td>
                  <NuxtLink :to="'/rms/reservations/calendar'">
                    {{ format(row.date, 'short') }}
                  </NuxtLink>
                </td>
                <td>{{ row.yacht_code }}</td>
                <td>{{ row.sold_berths }}</td>
                <td>{{ row.sellable_berths }}</td>
                <td>
                  <div class="dash-occ">
                    <div class="cmp">
                      <i :style="{ width: occupancyBarWidth(row.occupancy), background: barColor(row.occupancy) }" />
                    </div>
                    <span :class="{ 'pay-kpi-coral': occupancyIsLow(row.occupancy, lowOccupancyPct) }">
                      {{ percentOrDash(row.occupancy) }}
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>{{ t('dashboard.channelTitle') }}</h3>
        <p class="mono dash-def">
          {{ definitionLine(metrics.metrics.channel_mix.definition) }}
        </p>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th>{{ t('dashboard.colChannel') }}</th>
                <th>{{ t('dashboard.colBookings') }}</th>
                <th>{{ t('dashboard.colRevenue') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="metrics.metrics.channel_mix.rows.length === 0"
                class="dr-empty"
              >
                <td colspan="3">
                  {{ t('dashboard.channelEmpty') }}
                </td>
              </tr>
              <tr
                v-for="row in metrics.metrics.channel_mix.rows"
                :key="row.channel"
              >
                <td>{{ row.channel }}</td>
                <td>{{ row.bookings }}</td>
                <td>{{ money(row.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>{{ t('dashboard.nationalityTitle') }}</h3>
        <p class="mono dash-def">
          {{ definitionLine(metrics.metrics.nationality_mix.definition) }}
        </p>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th>{{ t('dashboard.colCountry') }}</th>
                <th>{{ t('dashboard.colGuests') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="metrics.metrics.nationality_mix.rows.length === 0 && metrics.metrics.nationality_mix.unknown === 0"
                class="dr-empty"
              >
                <td colspan="2">
                  {{ t('dashboard.nationalityEmpty') }}
                </td>
              </tr>
              <tr
                v-for="row in metrics.metrics.nationality_mix.rows"
                :key="row.country_code"
              >
                <td>{{ row.country_code }}</td>
                <td>{{ row.guests }}</td>
              </tr>
              <tr v-if="metrics.metrics.nationality_mix.unknown > 0">
                <td>{{ t('dashboard.unknownCountry') }}</td>
                <td>{{ metrics.metrics.nationality_mix.unknown }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>{{ t('dashboard.npsTitle') }}</h3>
        <div class="krow">
          <AnkKpi :label="t('dashboard.npsAverage')">
            {{ metrics.metrics.nps.average_score ?? t('dashboard.dash') }}
          </AnkKpi>
          <AnkKpi :label="t('dashboard.npsPromoters')">
            {{ metrics.metrics.nps.promoters }}
          </AnkKpi>
          <AnkKpi :label="t('dashboard.npsPassives')">
            {{ metrics.metrics.nps.passives }}
          </AnkKpi>
          <AnkKpi :label="t('dashboard.npsDetractors')">
            {{ metrics.metrics.nps.detractors }}
          </AnkKpi>
          <AnkKpi :label="t('dashboard.npsResponses')">
            {{ metrics.metrics.nps.responses }}
          </AnkKpi>
        </div>
      </div>
    </template>
  </div>
</template>
