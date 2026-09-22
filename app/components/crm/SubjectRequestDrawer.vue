<script setup lang="ts">
import type { ContactProfile, SubjectRequest } from '../../types/api'
import { filenameFromDisposition } from '../documents/documentFetch'
import { firstApiMessage } from '../../utils/apiForm'
import { subjectRequestDueClass } from './privacyHelpers'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  requestId: number | null
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const config = useRuntimeConfig()
const toast = useToast()

const row = ref<SubjectRequest | null>(null)
const contact = ref<ContactProfile | null>(null)
const verifiedHow = ref('')
const outcome = ref('')
const confirmation = ref('')
const error = ref('')
const saving = ref(false)

const dueClass = computed(() => row.value === null
  ? ''
  : subjectRequestDueClass(row.value.due_at, row.value.status))

watch(
  () => [open.value, props.requestId] as const,
  async ([isOpen, id]) => {
    if (!isOpen || id === null) {
      return
    }

    verifiedHow.value = ''
    outcome.value = ''
    confirmation.value = ''
    error.value = ''
    await load(id)
  }
)

async function load(id: number): Promise<void> {
  row.value = await request(`/api/privacy/requests/${String(id)}`) as SubjectRequest
  contact.value = await request(`/api/crm/contacts/${String(row.value.contact_id)}`) as ContactProfile
}

async function run(path: string, body: Record<string, string>): Promise<void> {
  if (row.value === null || verifiedHow.value.trim() === '') {
    return
  }

  saving.value = true
  error.value = ''

  try {
    row.value = await request(path, { method: 'POST', body }) as SubjectRequest
    emit('changed')
    toast.add({ title: t('crmPrivacy.requestUpdated') })
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmPrivacy.requestFailed')
  } finally {
    saving.value = false
  }
}

async function buildExport(): Promise<void> {
  if (row.value === null) {
    return
  }

  saving.value = true
  error.value = ''

  try {
    row.value = await request(`/api/privacy/requests/${String(row.value.id)}/export`, { method: 'POST' }) as SubjectRequest
    emit('changed')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmPrivacy.requestFailed')
  } finally {
    saving.value = false
  }
}

async function downloadExport(): Promise<void> {
  if (row.value === null) {
    return
  }

  const base = String(config.public.apiBase).replace(/\/$/, '')
  const response = await fetch(`${base}/api/privacy/requests/${String(row.value.id)}/export`, {
    credentials: 'include'
  })

  if (!response.ok) {
    error.value = t('crmPrivacy.requestFailed')
    return
  }

  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filenameFromDisposition(response.headers.get('content-disposition'), `access-${String(row.value.id)}.zip`)
  link.click()
  URL.revokeObjectURL(url)
}

function complete(): Promise<void> {
  if (row.value === null) {
    return Promise.resolve()
  }

  return run(`/api/privacy/requests/${String(row.value.id)}/complete`, {
    verified_how: verifiedHow.value.trim(),
    outcome: outcome.value.trim()
  })
}

function reject(): Promise<void> {
  if (row.value === null) {
    return Promise.resolve()
  }

  return run(`/api/privacy/requests/${String(row.value.id)}/reject`, {
    verified_how: verifiedHow.value.trim(),
    outcome: outcome.value.trim()
  })
}

function erase(): Promise<void> {
  if (row.value === null) {
    return Promise.resolve()
  }

  return run(`/api/privacy/requests/${String(row.value.id)}/erase`, {
    verified_how: verifiedHow.value.trim(),
    confirmation: confirmation.value.trim()
  })
}
</script>

<template>
  <USlideover
    :open="open"
    class="history-drawer"
    @update:open="open = $event"
  >
    <template #header>
      <div v-if="row">
        <h2>{{ t(`crmPrivacy.types.${row.type}`) }}</h2>
        <div class="bid">
          {{ row.status }}
          ·
          {{ contact?.name ?? t('crmContacts.contactId', { id: String(row.contact_id) }) }}
        </div>
      </div>
    </template>
    <template #body>
      <div
        v-if="row"
        class="sec"
      >
        <p
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </p>
        <div class="kv">
          <span>{{ t('crmPrivacy.received') }}</span>
          <span>{{ format(row.received_at, 'dateTime') }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmPrivacy.due') }}</span>
          <span :class="dueClass">{{ format(row.due_at, 'dateTime') }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmPrivacy.channel') }}</span>
          <span>{{ t(`crmPrivacy.channels.${row.channel}`) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmPrivacy.status') }}</span>
          <span>{{ row.status }}</span>
        </div>
        <p
          v-if="row.outcome"
          class="crm-held"
        >
          {{ row.outcome }}
        </p>
        <NuxtLink
          class="lnk"
          :to="`/crm/sales/contacts?open=${String(row.contact_id)}`"
        >
          {{ t('crmPipeline.openContact') }}
        </NuxtLink>

        <template v-if="row.status === 'OPEN'">
          <div class="field">
            <label for="sr-verified">{{ t('crmPrivacy.verifiedHow') }}</label>
            <input
              id="sr-verified"
              v-model="verifiedHow"
              type="text"
            >
          </div>

          <template v-if="row.type === 'ACCESS'">
            <p class="crm-held">
              {{ t('crmPrivacy.accessHint') }}
            </p>
            <div class="crm-deal-actions">
              <UButton
                variant="outline"
                :loading="saving"
                @click="buildExport"
              >
                {{ t('crmPrivacy.buildExport') }}
              </UButton>
              <UButton
                v-if="row.has_export"
                variant="outline"
                @click="downloadExport"
              >
                {{ t('crmPrivacy.download') }}
              </UButton>
            </div>
          </template>

          <template v-if="row.type === 'RECTIFICATION'">
            <p class="crm-held">
              {{ t('crmPrivacy.rectificationHint') }}
            </p>
          </template>

          <template v-if="row.type === 'OBJECTION'">
            <p class="crm-held">
              {{ t('crmPrivacy.objectionHint') }}
            </p>
          </template>

          <template v-if="row.type === 'ERASURE'">
            <p class="crm-held">
              {{ t('crmPrivacy.erasureHint') }}
            </p>
            <div class="field">
              <label for="sr-confirm">{{ t('crmPrivacy.confirmEmail') }}</label>
              <input
                id="sr-confirm"
                v-model="confirmation"
                type="email"
                autocomplete="off"
              >
            </div>
            <UButton
              :disabled="saving || verifiedHow.trim() === '' || confirmation.trim() === ''"
              :loading="saving"
              @click="erase"
            >
              {{ t('crmPrivacy.erase') }}
            </UButton>
            <div class="field">
              <label for="sr-reject-outcome">{{ t('crmPrivacy.rejectOutcome') }}</label>
              <textarea
                id="sr-reject-outcome"
                v-model="outcome"
                rows="3"
              />
            </div>
            <UButton
              variant="outline"
              :disabled="saving || verifiedHow.trim() === '' || outcome.trim() === ''"
              @click="reject"
            >
              {{ t('crmPrivacy.reject') }}
            </UButton>
          </template>

          <template v-else>
            <div class="field">
              <label for="sr-outcome">{{ t('crmPrivacy.outcome') }}</label>
              <textarea
                id="sr-outcome"
                v-model="outcome"
                rows="3"
              />
            </div>
            <div class="crm-deal-actions">
              <UButton
                :disabled="saving || verifiedHow.trim() === '' || outcome.trim() === ''"
                :loading="saving"
                @click="complete"
              >
                {{ t('crmPrivacy.complete') }}
              </UButton>
              <UButton
                variant="outline"
                :disabled="saving || verifiedHow.trim() === '' || outcome.trim() === ''"
                @click="reject"
              >
                {{ t('crmPrivacy.reject') }}
              </UButton>
            </div>
          </template>
        </template>
      </div>
    </template>
  </USlideover>
</template>
