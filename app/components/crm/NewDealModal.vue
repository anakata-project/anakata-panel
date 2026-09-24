<script setup lang="ts">
import type { CrmContact, DealInput, DealType, Paginated } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  created: []
}>()

const STAGES: Array<DealInput['stage']> = ['NEW_LEAD', 'QUALIFYING', 'QUOTED', 'NEGOTIATION']
const TYPES: Array<DealType> = ['FIT', 'GROUP', 'CHARTER', 'AGENCY']

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const query = ref('')
const matches = ref<Array<CrmContact>>([])
const contactId = ref('')
const title = ref('')
const type = ref<DealType>('FIT')
const stage = ref<DealInput['stage']>('NEW_LEAD')
const estimate = ref('')
const saving = ref(false)
const error = ref('')

const contactItems = computed(() => matches.value.map(contact => ({
  label: contact.name,
  value: String(contact.id)
})))

const typeItems = computed(() => TYPES.map(item => ({
  label: t(`crmPipeline.types.${item}`),
  value: item
})))

const stageItems = computed(() => STAGES.map(item => ({
  label: t(`crmPipeline.stages.${item}`),
  value: item
})))

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  query.value = ''
  matches.value = []
  contactId.value = ''
  title.value = ''
  type.value = 'FIT'
  stage.value = 'NEW_LEAD'
  estimate.value = ''
  error.value = ''
})

async function search(): Promise<void> {
  const q = query.value.trim()

  if (q === '') {
    matches.value = []
    return
  }

  const page = await request(`/api/crm/contacts?q=${encodeURIComponent(q)}&per_page=20`) as Paginated<CrmContact>
  matches.value = page.data
}

async function submit(): Promise<void> {
  if (contactId.value === '' || title.value.trim() === '') {
    return
  }

  const body: DealInput = {
    contact_id: Number(contactId.value),
    title: title.value.trim(),
    type: type.value,
    stage: stage.value
  }

  if (estimate.value.trim() !== '') {
    body.estimate = Number(estimate.value)
  }

  saving.value = true
  error.value = ''

  try {
    await request('/api/crm/deals', { method: 'POST', body })
    toast.add({ title: t('crmPipeline.dealCreated') })
    open.value = false
    emit('created')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmPipeline.moveFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('crmPipeline.newDeal')"
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
          <label for="deal-contact">{{ t('crmPipeline.contact') }}</label>
          <div class="crm-inline">
            <input
              id="deal-contact"
              v-model="query"
              type="search"
              @keydown.enter.prevent="search"
            >
            <UButton
              type="button"
              variant="outline"
              @click="search"
            >
              {{ t('crmContacts.search') }}
            </UButton>
          </div>
          <USelect
            v-model="contactId"
            class="w-full"
            :placeholder="t('crmPipeline.pickContact')"
            :items="contactItems"
          />
        </div>
        <div class="field">
          <label for="deal-title">{{ t('crmPipeline.dealTitle') }}</label>
          <input
            id="deal-title"
            v-model="title"
            type="text"
          >
        </div>
        <div class="field">
          <label for="deal-type">{{ t('crmPipeline.type') }}</label>
          <USelect
            id="deal-type"
            v-model="type"
            class="w-full"
            :items="typeItems"
          />
        </div>
        <div class="field">
          <label for="deal-estimate">{{ t('crmPipeline.estimate') }}</label>
          <input
            id="deal-estimate"
            v-model="estimate"
            type="number"
            min="0"
            step="1"
          >
        </div>
        <div class="field">
          <label for="deal-stage">{{ t('crmPipeline.stage') }}</label>
          <USelect
            id="deal-stage"
            v-model="stage"
            class="w-full"
            :items="stageItems"
          />
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
            :disabled="saving || contactId === '' || title.trim() === ''"
          >
            {{ t('crmPipeline.newDeal') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
