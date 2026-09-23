<script setup lang="ts">
import type { Conversation, ConversationMessage, ConversationReplyInput } from '../../types/api'
import ConversationLinkSearch from './ConversationLinkSearch.vue'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  conversationId: number | null
  detail: Conversation | null
}>()

const emit = defineEmits<{
  updated: [previousId: number, conversation: Conversation]
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const toast = useToast()

const thread = ref<Conversation | null>(null)
const error = ref('')
const loading = ref(false)
const draft = ref('')
const saving = ref(false)
let requestToken = 0

const messages = computed(() => thread.value?.messages ?? [])
const canSend = computed(() => draft.value.trim() !== '' && !saving.value)

function contactHref(id: number): string {
  return `/crm/sales/contacts?open=${String(id)}`
}

function htmlBody(message: ConversationMessage): string {
  return message.body_html.trim()
}

async function load(id: number): Promise<void> {
  const token = ++requestToken
  loading.value = true
  error.value = ''

  try {
    const result = await request(`/api/crm/conversations/${String(id)}`) as Conversation

    if (token !== requestToken) {
      return
    }

    thread.value = result
    emit('updated', id, result)
  } catch (caught: unknown) {
    if (token !== requestToken) {
      return
    }

    error.value = firstApiMessage(caught) ?? t('crmInbox.failed')
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

watch([open, () => props.conversationId], ([isOpen, id]) => {
  if (isOpen && id !== null) {
    void load(id)
  }
})

watch(() => props.detail, (next) => {
  if (next && next.id === props.conversationId && Array.isArray(next.messages)) {
    thread.value = next
  }
})

function onLinked(next: Conversation): void {
  const previousId = props.conversationId

  if (previousId === null) {
    return
  }

  thread.value = next
  toast.add({ title: t('crmInbox.linked') })
  emit('updated', previousId, next)
}

async function sendReply(): Promise<void> {
  if (props.conversationId === null || !canSend.value) {
    return
  }

  const previousId = props.conversationId
  saving.value = true
  error.value = ''
  const body: ConversationReplyInput = { message: draft.value.trim() }

  try {
    const saved = await request(`/api/crm/conversations/${String(previousId)}/reply`, {
      method: 'POST',
      body
    }) as Conversation
    thread.value = saved
    draft.value = ''
    toast.add({ title: t('crmInbox.sent') })
    emit('updated', previousId, saved)
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmInbox.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="thread?.subject ?? t('crmInbox.title')"
  >
    <template #body>
      <p
        v-if="error"
        class="warnbox"
      >
        {{ error }}
      </p>
      <p
        v-if="loading && thread === null"
        class="crm-held"
      >
        {{ t('crmInbox.title') }}
      </p>
      <template v-else-if="thread">
        <p>
          <NuxtLink
            v-if="thread.contact_id !== null"
            :to="contactHref(thread.contact_id)"
          >
            {{ thread.contact_name }}
          </NuxtLink>
          <span
            v-else
            class="inbox-unmatched"
          >{{ thread.from ?? '—' }}</span>
        </p>
        <ConversationLinkSearch
          v-if="thread.contact_id === null"
          :conversation-id="thread.id"
          @linked="onLinked"
        />
        <p
          v-if="messages.length === 0"
          class="crm-held"
        >
          {{ t('crmInbox.noMessages') }}
        </p>
        <div
          v-else
          class="inbox-thread"
        >
          <article
            v-for="message in messages"
            :key="message.id"
            class="inbox-msg"
            :class="message.direction === 'IN' ? 'inbox-in' : 'inbox-out'"
          >
            <p>
              <span class="pill">{{ message.direction }}</span>
              {{ message.from }}
              <span class="nw">{{ format(message.sent_at, 'dateTime') }}</span>
            </p>
            <iframe
              v-if="htmlBody(message) !== ''"
              sandbox=""
              :srcdoc="message.body_html"
              :title="message.subject"
            />
            <p v-else>
              {{ message.body_text }}
            </p>
          </article>
        </div>
        <form
          class="inbox-composer"
          @submit.prevent="sendReply"
        >
          <label for="inbox-reply">{{ t('crmInbox.reply') }}</label>
          <textarea
            id="inbox-reply"
            v-model="draft"
            :placeholder="t('crmInbox.replyPlaceholder')"
          />
          <UButton
            type="submit"
            variant="outline"
            :disabled="!canSend"
            :loading="saving"
          >
            {{ t('crmInbox.reply') }}
          </UButton>
        </form>
      </template>
    </template>
  </USlideover>
</template>
