<script setup lang="ts">
import type { Offer } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { compactOfferWindow, offerStatusPillClass } from './offerHelpers'

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const toast = useToast()

const canManage = computed(() => can('offers.manage'))
const { data: listPayload, refresh } = useFetch<{ data: Array<Offer> }>('/api/rms/offers')
const offers = computed(() => listPayload.value?.data ?? [])

const pausing = ref<number | null>(null)

async function pause(offer: Offer, event: Event): Promise<void> {
  event.stopPropagation()

  if (!canManage.value) {
    return
  }

  pausing.value = offer.id

  try {
    await request(`/api/rms/offers/${offer.id}/pause`, { method: 'POST' })
    toast.add({ title: t('offers.pausedToast') })
    await refresh()
  } catch (error: unknown) {
    toast.add({ title: firstApiMessage(error) ?? (error instanceof Error ? error.message : '') })
  } finally {
    pausing.value = null
  }
}
</script>

<template>
  <AnkPanel :title="t('rates.promotionsTitle')">
    <div class="bk-table-wrap">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('offers.colCode') }}</th>
            <th>{{ t('offers.colBenefit') }}</th>
            <th>{{ t('offers.colScope') }}</th>
            <th>{{ t('offers.colWindow') }}</th>
            <th>{{ t('offers.colStatus') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="offers.length === 0"
            class="dr-empty"
          >
            <td colspan="6">
              {{ t('offers.empty') }}
            </td>
          </tr>
          <tr
            v-for="offer in offers"
            :key="offer.id"
            :class="{ 'promo-off': offer.status !== 'LIVE' }"
          >
            <td>
              <span class="of-code">{{ offer.code }}</span>
            </td>
            <td>{{ offer.benefit_label }}</td>
            <td class="of-scope">
              {{ offer.scope_label }}
            </td>
            <td>{{ compactOfferWindow(offer) }}</td>
            <td>
              <span
                class="pill"
                :class="offerStatusPillClass(offer.status)"
              >{{ t(`offers.status.${offer.status}`) }}</span>
            </td>
            <td class="list-actions">
              <UButton
                v-if="canManage && offer.stored_status === 'LIVE'"
                variant="outline"
                :loading="pausing === offer.id"
                @click="pause(offer, $event)"
              >
                {{ t('offers.pause') }}
              </UButton>
              <NuxtLink
                class="lnk"
                to="/rms/booking-engine/offers"
              >
                {{ t('offers.manage') }}
              </NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="note of-promo-note">
      <NuxtLink
        class="lnk"
        to="/rms/booking-engine/offers"
      >
        {{ t('rates.offersLink') }}
      </NuxtLink>
      {{ t('rates.promotionsNote') }}
    </p>
  </AnkPanel>
</template>
