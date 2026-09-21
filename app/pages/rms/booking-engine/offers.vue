<script setup lang="ts">
import type { Itinerary, Offer } from '../../../types/api'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import OfferDrawer from '../../../components/offers/OfferDrawer.vue'
import { offerStatusPillClass } from '../../../components/offers/offerHelpers'

const { can } = useAuth()
const { t } = useI18n()
const { useFetch } = useApi()
const { format } = useDates()

const from = ref<string | null>(null)
const to = ref<string | null>(null)
const today = computed(() => format(new Date(), 'iso'))
const editorOpen = ref(false)
const selected = ref<Offer | null>(null)

const canManage = computed(() => can('offers.manage'))
const canApprove = computed(() => can('offers.approve'))

const listUrl = computed(() => {
  const params = new URLSearchParams()

  if (from.value !== null) {
    params.set('from', from.value)
  }

  if (to.value !== null) {
    params.set('to', to.value)
  }

  const query = params.toString()

  return query === '' ? '/api/rms/offers' : `/api/rms/offers?${query}`
})

const { data: listPayload, refresh } = useFetch<{ data: Array<Offer> }>(listUrl)
const { data: itinerariesPayload } = useFetch<{ data: Array<Itinerary> }>('/api/rms/itineraries')

const offers = computed(() => listPayload.value?.data ?? [])
const itineraries = computed(() => itinerariesPayload.value?.data ?? [])
const total = computed(() => offers.value.length)

function openNew(): void {
  selected.value = null
  editorOpen.value = true
}

function openExisting(offer: Offer): void {
  selected.value = offer
  editorOpen.value = true
}

function enginePlacementLabel(offer: Offer): string {
  if (offer.engine_placement === 'badge') {
    return offer.badge ?? t('offers.placementBadge')
  }

  if (offer.engine_placement === 'price_line_only') {
    return t('offers.placementPriceLine')
  }

  return t('offers.placementNotPublic')
}

async function onSaved(offer: Offer): Promise<void> {
  await refresh()
  selected.value = offers.value.find(item => item.id === offer.id) ?? offer
}
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="t('offers.fieldLabel')"
      :noun="t('offers.noun')"
      :total="total"
      :today="today"
    />

    <p class="notice of-notice">
      {{ t('offers.notice') }}
    </p>

    <div class="ebtool">
      <span />
      <div class="acts">
        <UButton
          v-if="canManage"
          @click="openNew"
        >
          {{ t('offers.new') }}
        </UButton>
      </div>
    </div>

    <div class="panel">
      <h3>{{ t('offers.panelTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('offers.colCode') }}</th>
              <th>{{ t('offers.colBenefit') }}</th>
              <th>{{ t('offers.colApplies') }}</th>
              <th>{{ t('offers.colBooking') }}</th>
              <th>{{ t('offers.colTravel') }}</th>
              <th>{{ t('offers.colEngine') }}</th>
              <th>{{ t('offers.colStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="offers.length === 0"
              class="dr-empty"
            >
              <td colspan="7">
                {{ t('offers.empty') }}
              </td>
            </tr>
            <tr
              v-for="offer in offers"
              :key="offer.id"
              class="bk-row"
              @click="openExisting(offer)"
            >
              <td>
                <span class="of-code">{{ offer.code }}</span>
                <br>
                {{ offer.name }}
              </td>
              <td>{{ offer.benefit_label }}</td>
              <td class="of-scope">
                {{ offer.scope_label }}
              </td>
              <td>{{ offer.booking_window_label }}</td>
              <td>{{ offer.travel_window_label }}</td>
              <td>
                <span
                  v-if="offer.engine_placement === 'badge' && offer.badge"
                  class="badge-offer"
                >{{ offer.badge }}</span>
                <span
                  v-else
                  class="of-placement"
                >{{ enginePlacementLabel(offer) }}</span>
                <div
                  v-if="offer.status === 'LIVE'"
                  class="of-hits"
                >
                  {{ t('offers.departuresCount', { n: String(offer.live_departures_count) }) }}
                </div>
              </td>
              <td>
                <span
                  class="pill"
                  :class="offerStatusPillClass(offer.status)"
                >{{ t(`offers.status.${offer.status}`) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <OfferDrawer
      v-model:open="editorOpen"
      :source="selected"
      :itineraries="itineraries"
      :can-manage="canManage"
      :can-approve="canApprove"
      @saved="onSaved"
    />
  </div>
</template>
