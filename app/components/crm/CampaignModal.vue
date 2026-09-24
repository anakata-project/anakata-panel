<script setup lang="ts">
import type { Campaign, CampaignInput, CampaignOffer, CampaignUpdate } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  offers: Array<CampaignOffer>
  campaign: Campaign | null
  presetOfferId: number | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const name = ref('')
const offerId = ref('')
const utm = ref('')
const audience = ref('')
const spend = ref('0')
const saving = ref(false)
const error = ref('')

const offerChoices = computed(() => {
  const rows = [...props.offers]
  const current = props.campaign?.offer

  if (current !== null && current !== undefined && !rows.some(row => row.id === current.id)) {
    rows.unshift(current)
  }

  return rows
})

const offerItems = computed(() => [
  { label: t('crmCampaigns.noOffer'), value: '' },
  ...offerChoices.value.map(offer => ({
    label: `${offer.code} · ${offer.name}`,
    value: String(offer.id)
  }))
])

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  error.value = ''
  const campaign = props.campaign

  if (campaign === null) {
    name.value = ''
    offerId.value = props.presetOfferId === null ? '' : String(props.presetOfferId)
    utm.value = ''
    audience.value = ''
    spend.value = '0'
    return
  }

  name.value = campaign.name
  offerId.value = campaign.offer === null ? '' : String(campaign.offer.id)
  utm.value = campaign.utm_campaign ?? ''
  audience.value = campaign.audience ?? ''
  spend.value = String(campaign.media_spend)
})

async function submit(): Promise<void> {
  if (name.value.trim() === '') {
    return
  }

  const spendValue = Number(spend.value)
  const body: CampaignInput = {
    name: name.value.trim(),
    offer_id: offerId.value === '' ? null : Number(offerId.value),
    utm_campaign: utm.value.trim() === '' ? null : utm.value.trim(),
    audience: audience.value.trim() === '' ? null : audience.value.trim(),
    media_spend: Number.isInteger(spendValue) && spendValue >= 0 ? spendValue : 0
  }

  saving.value = true
  error.value = ''

  try {
    if (props.campaign === null) {
      await request('/api/crm/campaigns', { method: 'POST', body })
      toast.add({ title: t('crmCampaigns.created') })
    } else {
      const update: CampaignUpdate = body
      await request(`/api/crm/campaigns/${String(props.campaign.id)}`, { method: 'PATCH', body: update })
      toast.add({ title: t('crmCampaigns.saved') })
    }

    open.value = false
    emit('saved')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmCampaigns.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="campaign === null ? t('crmCampaigns.create') : t('crmCampaigns.edit')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="field">
          <label for="camp-name">{{ t('crmCampaigns.name') }}</label>
          <input
            id="camp-name"
            v-model="name"
            type="text"
            required
          >
        </div>
        <div class="field">
          <label for="camp-offer">{{ t('crmCampaigns.offer') }}</label>
          <USelect
            id="camp-offer"
            v-model="offerId"
            class="w-full"
            :items="offerItems"
          />
        </div>
        <div class="field">
          <label for="camp-utm">{{ t('crmCampaigns.utm') }}</label>
          <input
            id="camp-utm"
            v-model="utm"
            type="text"
          >
        </div>
        <div class="field">
          <label for="camp-audience">{{ t('crmCampaigns.audience') }}</label>
          <input
            id="camp-audience"
            v-model="audience"
            type="text"
          >
        </div>
        <div class="field">
          <label for="camp-spend">{{ t('crmCampaigns.spend') }}</label>
          <input
            id="camp-spend"
            v-model="spend"
            type="number"
            min="0"
            step="1"
          >
        </div>
        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="saving"
            @click="open = false"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="saving"
            :disabled="saving || name.trim() === ''"
          >
            {{ campaign === null ? t('crmCampaigns.create') : t('crmCampaigns.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
