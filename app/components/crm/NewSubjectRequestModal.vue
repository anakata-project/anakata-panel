<script setup lang="ts">
import type {
  CrmContact,
  Paginated,
  SubjectRequestChannel,
  SubjectRequestInput,
  SubjectRequestType
} from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  created: []
}>()

const TYPES: Array<SubjectRequestType> = ['ACCESS', 'ERASURE', 'RECTIFICATION', 'OBJECTION']
const CHANNELS: Array<SubjectRequestChannel> = ['EMAIL', 'PHONE', 'LETTER', 'IN_PERSON']

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const query = ref('')
const matches = ref<Array<CrmContact>>([])
const contactId = ref('')
const type = ref<SubjectRequestType>('ACCESS')
const received = ref('')
const channel = ref<SubjectRequestChannel>('EMAIL')
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  query.value = ''
  matches.value = []
  contactId.value = ''
  type.value = 'ACCESS'
  received.value = ''
  channel.value = 'EMAIL'
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
  if (contactId.value === '' || received.value === '') {
    return
  }

  const body: SubjectRequestInput = {
    contact_id: Number(contactId.value),
    type: type.value,
    received_at: new Date(received.value).toISOString(),
    channel: channel.value
  }

  saving.value = true
  error.value = ''

  try {
    await request('/api/privacy/requests', { method: 'POST', body })
    toast.add({ title: t('crmPrivacy.requestCreated') })
    open.value = false
    emit('created')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmPrivacy.requestFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('crmPrivacy.newRequest')"
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
          <label for="sr-contact">{{ t('crmPipeline.contact') }}</label>
          <div class="crm-inline">
            <input
              id="sr-contact"
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
          <select v-model="contactId">
            <option value="">
              {{ t('crmPipeline.pickContact') }}
            </option>
            <option
              v-for="contact in matches"
              :key="contact.id"
              :value="String(contact.id)"
            >
              {{ contact.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="sr-type">{{ t('crmPrivacy.type') }}</label>
          <select
            id="sr-type"
            v-model="type"
          >
            <option
              v-for="item in TYPES"
              :key="item"
              :value="item"
            >
              {{ t(`crmPrivacy.types.${item}`) }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="sr-received">{{ t('crmPrivacy.received') }}</label>
          <input
            id="sr-received"
            v-model="received"
            type="datetime-local"
          >
        </div>
        <div class="field">
          <label for="sr-channel">{{ t('crmPrivacy.channel') }}</label>
          <select
            id="sr-channel"
            v-model="channel"
          >
            <option
              v-for="item in CHANNELS"
              :key="item"
              :value="item"
            >
              {{ t(`crmPrivacy.channels.${item}`) }}
            </option>
          </select>
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
            :disabled="saving || contactId === '' || received === ''"
          >
            {{ t('crmPrivacy.newRequest') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
