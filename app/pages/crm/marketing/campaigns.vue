<script setup lang="ts">
import type {
  AttributionModelRow,
  Campaign,
  CampaignBooking,
  CampaignOffer
} from '../../../types/api'
import CampaignModal from '../../../components/crm/CampaignModal.vue'
import { formatMeasure } from '../../../components/crm/campaignHelpers'
import { offerStatusPillClass } from '../../../components/offers/offerHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

type CampaignPayload = {
  data: Array<Campaign>
  meta: {
    notes: {
      sends: string
    }
  }
}

const { t } = useI18n()
const { request } = useApi()
const { format: money } = useMoney()
const { can } = useAuth()
const toast = useToast()

const campaigns = ref<Array<Campaign>>([])
const offers = ref<Array<CampaignOffer>>([])
const model = ref<Array<AttributionModelRow>>([])
const conflict = ref('')
const sendsNote = ref('')
const loadError = ref('')
const bookings = ref<Record<number, Array<CampaignBooking>>>({})
const openBookings = ref<number | null>(null)
const modalOpen = ref(false)
const editing = ref<Campaign | null>(null)
const presetOfferId = ref<number | null>(null)

const canManage = computed(() => can('campaigns.manage'))

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  try {
    const [cards, bare, attribution] = await Promise.all([
      request('/api/crm/campaigns') as Promise<CampaignPayload>,
      request('/api/crm/campaigns/offers-without-campaign') as Promise<{ data: Array<CampaignOffer> }>,
      request('/api/crm/campaigns/attribution-model') as Promise<{ data: Array<AttributionModelRow>, conflict: string }>
    ])
    campaigns.value = cards.data
    sendsNote.value = cards.meta.notes.sends
    offers.value = bare.data
    model.value = attribution.data
    conflict.value = attribution.conflict
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmCampaigns.failed')
  }
}

function windowText(from: string | null, to: string | null): string {
  if (from === null && to === null) {
    return '—'
  }

  return `${from ?? '—'} – ${to ?? '—'}`
}

function moneyOrDash(value: number | null): string {
  return value === null ? '—' : money(value)
}

async function toggleBookings(id: number): Promise<void> {
  if (openBookings.value === id) {
    openBookings.value = null
    return
  }

  openBookings.value = id

  if (bookings.value[id] !== undefined) {
    return
  }

  const page = await request(`/api/crm/campaigns/${String(id)}/bookings`) as { data: Array<CampaignBooking> }
  bookings.value = { ...bookings.value, [id]: page.data }
}

function createFor(offerId: number | null): void {
  editing.value = null
  presetOfferId.value = offerId
  modalOpen.value = true
}

function edit(campaign: Campaign): void {
  editing.value = campaign
  presetOfferId.value = null
  modalOpen.value = true
}

async function archive(campaign: Campaign): Promise<void> {
  try {
    await request(`/api/crm/campaigns/${String(campaign.id)}/archive`, { method: 'POST' })
    toast.add({ title: t('crmCampaigns.archived') })
    await load()
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmCampaigns.failed')
  }
}
</script>

<template>
  <div>
    <p class="notice crm-notice">
      {{ t('crmCampaigns.notice') }}
    </p>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>

    <div
      v-for="campaign in campaigns"
      :key="campaign.id"
      class="panel"
    >
      <div class="bk-toolbar">
        <h3>
          {{ campaign.name }}
          <span
            v-if="campaign.offer"
            class="pill"
            :class="offerStatusPillClass(campaign.offer.status)"
          >{{ campaign.offer.status }}</span>
          <span
            v-if="campaign.status === 'ARCHIVED'"
            class="pill new"
          >{{ campaign.status }}</span>
        </h3>
        <div
          v-if="canManage && campaign.status === 'ACTIVE'"
          class="crm-deal-actions"
        >
          <UButton
            variant="outline"
            @click="edit(campaign)"
          >
            {{ t('crmCampaigns.edit') }}
          </UButton>
          <UButton
            variant="outline"
            @click="archive(campaign)"
          >
            {{ t('crmCampaigns.archive') }}
          </UButton>
        </div>
      </div>
      <p v-if="campaign.offer">
        {{ campaign.offer.code }} · {{ campaign.offer.value_text }}
      </p>
      <p v-if="campaign.offer">
        {{ windowText(campaign.offer.booking_window.from, campaign.offer.booking_window.to) }}
        · {{ windowText(campaign.offer.travel_window.from, campaign.offer.travel_window.to) }}
        · {{ campaign.offer.channel }}
        <span class="sysbadge sys-rms">{{ t('crmCampaigns.publishedInRms') }}</span>
      </p>
      <p class="crm-held">
        {{ campaign.audience ?? '—' }}
      </p>
      <div class="kv">
        <span>{{ t('crmCampaigns.redeemed') }}</span>
        <span>{{ formatMeasure(campaign.redeemed) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.revenue') }}</span>
        <span>{{ moneyOrDash(campaign.revenue) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.firstTouch') }}</span>
        <span>{{ formatMeasure(campaign.attributed_first.count) }} · {{ moneyOrDash(campaign.attributed_first.revenue) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.lastTouch') }}</span>
        <span>{{ formatMeasure(campaign.attributed_last.count) }} · {{ moneyOrDash(campaign.attributed_last.revenue) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.trade') }}</span>
        <span>{{ moneyOrDash(campaign.trade) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.spend') }}</span>
        <span>{{ moneyOrDash(campaign.media_spend) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.roas') }}</span>
        <span>{{ campaign.roas ?? '—' }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.sends') }}</span>
        <span>{{ formatMeasure(campaign.sends) }}</span>
      </div>
      <div class="kv">
        <span>{{ t('crmCampaigns.clicks') }}</span>
        <span>{{ formatMeasure(campaign.clicks) }}</span>
      </div>
      <UButton
        variant="outline"
        @click="toggleBookings(campaign.id)"
      >
        {{ t('crmCampaigns.bookings') }}
      </UButton>
      <table
        v-if="openBookings === campaign.id"
        class="list"
      >
        <tbody>
          <tr v-if="(bookings[campaign.id] ?? []).length === 0">
            <td>{{ t('crmCampaigns.bookingsEmpty') }}</td>
          </tr>
          <tr
            v-for="row in bookings[campaign.id] ?? []"
            :key="row.id"
          >
            <td>
              <NuxtLink
                v-if="row.reference"
                :to="`/rms/reservations/bookings?open=${row.reference}`"
              >
                {{ row.reference }}
              </NuxtLink>
              <template v-else>
                —
              </template>
            </td>
            <td>{{ row.status }}</td>
            <td>{{ money(row.charges_total) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p
      v-if="sendsNote"
      class="crm-hint"
    >
      {{ sendsNote }}
    </p>

    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('crmCampaigns.without') }}</h3>
      </div>
      <table class="list">
        <tbody>
          <tr v-if="offers.length === 0">
            <td>{{ t('crmCampaigns.withoutEmpty') }}</td>
          </tr>
          <tr
            v-for="offer in offers"
            :key="offer.id"
          >
            <td>{{ offer.code }} · {{ offer.name }}</td>
            <td>{{ offer.value_text }}</td>
            <td>
              <UButton
                v-if="canManage"
                variant="outline"
                @click="createFor(offer.id)"
              >
                {{ t('crmCampaigns.create') }}
              </UButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('crmCampaigns.model') }}</h3>
      </div>
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('crmCampaigns.layer') }}</th>
            <th>{{ t('crmCampaigns.capturedBy') }}</th>
            <th>{{ t('crmCampaigns.storedOn') }}</th>
            <th>{{ t('crmCampaigns.usedFor') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in model"
            :key="row.layer"
          >
            <td>{{ row.layer }}</td>
            <td>{{ row.captured_by }}</td>
            <td>{{ row.stored_on }}</td>
            <td>{{ row.used_for }}</td>
          </tr>
        </tbody>
      </table>
      <p class="crm-hint">
        {{ conflict }}
      </p>
    </div>

    <CampaignModal
      v-model:open="modalOpen"
      :offers="offers"
      :campaign="editing"
      :preset-offer-id="presetOfferId"
      @saved="load"
    />
  </div>
</template>
