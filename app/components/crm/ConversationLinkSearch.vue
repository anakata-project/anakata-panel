<script setup lang="ts">
import type { Conversation, ConversationLinkInput, CrmContact, Paginated } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const props = defineProps<{
  conversationId: number
}>()

const emit = defineEmits<{
  linked: [conversation: Conversation]
}>()

const { t } = useI18n()
const { request } = useApi()

const open = ref(false)
const query = ref('')
const matches = ref<Array<CrmContact>>([])
const searched = ref(false)
const error = ref('')
const saving = ref(false)
let searchTimer: ReturnType<typeof setTimeout> | undefined

function onSearch(): void {
  searched.value = false
  window.clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void searchContacts()
  }, 300)
}

async function searchContacts(): Promise<void> {
  const term = query.value.trim()

  if (term === '') {
    matches.value = []
    searched.value = false
    return
  }

  try {
    const result = await request(`/api/crm/contacts?q=${encodeURIComponent(term)}&per_page=8`) as Paginated<CrmContact>
    matches.value = result.data
    searched.value = true
    error.value = ''
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmInbox.failed')
  }
}

async function choose(contact: CrmContact): Promise<void> {
  saving.value = true
  error.value = ''
  const body: ConversationLinkInput = { contact_id: contact.id }

  try {
    const saved = await request(`/api/crm/conversations/${String(props.conversationId)}/link-contact`, {
      method: 'POST',
      body
    }) as Conversation
    emit('linked', saved)
    open.value = false
    query.value = ''
    matches.value = []
    searched.value = false
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmInbox.failed')
  } finally {
    saving.value = false
  }
}

onUnmounted(() => {
  window.clearTimeout(searchTimer)
})
</script>

<template>
  <div
    class="inbox-link"
    @click.stop
  >
    <button
      type="button"
      class="lnk"
      @click="open = !open"
    >
      {{ t('crmInbox.link') }}
    </button>
    <template v-if="open">
      <label :for="`inbox-contact-${conversationId}`">{{ t('crmInbox.searchContacts') }}</label>
      <input
        :id="`inbox-contact-${conversationId}`"
        v-model="query"
        type="search"
        @input="onSearch"
      >
      <p
        v-if="error"
        class="warnbox"
      >
        {{ error }}
      </p>
      <p
        v-else-if="searched && matches.length === 0"
        class="crm-held"
      >
        {{ t('crmInbox.noContacts') }}
      </p>
      <button
        v-for="contact in matches"
        :key="contact.id"
        type="button"
        class="lnk"
        :disabled="saving"
        @click="choose(contact)"
      >
        {{ contact.name }}
      </button>
    </template>
  </div>
</template>
