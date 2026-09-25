<script setup lang="ts">
import type { CrmContact, Paginated, PipelineColumn, PipelineDeal, TaskInput, UserListItem } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const { request } = useApi()
const { can } = useAuth()
const toast = useToast()

const CONTACT_QUERY_MIN = 2
const CONTACT_SEARCH_MS = 250

const title = ref('')
const due = ref<string | null>(null)
const searchTerm = ref('')
const matches = ref<Array<CrmContact>>([])
const picked = ref<CrmContact | null>(null)
const contactId = ref('')
const dealId = ref('')
const deals = ref<Array<PipelineDeal>>([])
const ownerId = ref('')
const users = ref<Array<UserListItem>>([])
const saving = ref(false)
const searching = ref(false)
const error = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchSerial = 0
let dealSerial = 0

const canAssign = computed(() => can('records.act_on_any'))

const contactItems = computed(() => {
  const rows = [...matches.value]

  if (picked.value !== null && !rows.some(contact => contact.id === picked.value?.id)) {
    rows.unshift(picked.value)
  }

  return rows.map(contact => ({
    label: contact.name,
    value: String(contact.id)
  }))
})

const dealItems = computed(() => deals.value.map(deal => ({
  label: deal.title,
  value: String(deal.id)
})))

const ownerItems = computed(() => users.value.map(user => ({
  label: user.name,
  value: String(user.id)
})))

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  title.value = ''
  due.value = null
  searchTerm.value = ''
  matches.value = []
  picked.value = null
  contactId.value = ''
  dealId.value = ''
  deals.value = []
  dealSerial += 1
  clearTimeout(searchTimer)
  searchSerial += 1
  ownerId.value = ''
  error.value = ''

  if (canAssign.value && users.value.length === 0) {
    void request('/api/rms/users?per_page=100').then((page) => {
      users.value = (page as Paginated<UserListItem>).data
    }).catch(() => {
      users.value = []
    })
  }
})

watch(searchTerm, (value) => {
  clearTimeout(searchTimer)
  const q = value.trim()

  if (q.length < CONTACT_QUERY_MIN) {
    searchSerial += 1
    matches.value = []
    searching.value = false
    return
  }

  searchTimer = setTimeout(() => {
    void searchContacts(q)
  }, CONTACT_SEARCH_MS)
})

watch(contactId, (id) => {
  dealId.value = ''
  deals.value = []

  if (id === '') {
    picked.value = null
    dealSerial += 1
    return
  }

  const found = matches.value.find(contact => String(contact.id) === id)

  if (found !== undefined) {
    picked.value = found
  }

  void loadDeals(Number(id))
})

onScopeDispose(() => {
  clearTimeout(searchTimer)
})

async function loadDeals(contact: number): Promise<void> {
  const serial = ++dealSerial

  try {
    const payload = await request('/api/crm/pipeline') as { columns: Array<PipelineColumn> }

    if (serial !== dealSerial) {
      return
    }

    deals.value = payload.columns
      .flatMap(column => column.deals)
      .filter(deal => deal.contact.id === contact)
  } catch {
    if (serial === dealSerial) {
      deals.value = []
    }
  }
}

async function searchContacts(q: string): Promise<void> {
  const serial = ++searchSerial
  searching.value = true

  try {
    const page = await request(`/api/crm/contacts?q=${encodeURIComponent(q)}&per_page=20`) as Paginated<CrmContact>

    if (serial === searchSerial) {
      matches.value = page.data
    }
  } catch {
    if (serial === searchSerial) {
      matches.value = []
    }
  } finally {
    if (serial === searchSerial) {
      searching.value = false
    }
  }
}

function dueIso(): string | null {
  if (due.value === null || due.value === '') {
    return null
  }

  return new Date(`${due.value}T00:00:00`).toISOString()
}

async function submit(): Promise<void> {
  const dueAt = dueIso()

  if (title.value.trim() === '' || dueAt === null || contactId.value === '') {
    return
  }

  const body: TaskInput = {
    title: title.value.trim(),
    due_at: dueAt,
    contact_id: Number(contactId.value)
  }

  const deal = String(dealId.value).trim()

  if (deal !== '') {
    body.deal_id = Number(deal)
  }

  if (canAssign.value && ownerId.value !== '') {
    body.owner_id = Number(ownerId.value)
  }

  saving.value = true
  error.value = ''

  try {
    await request('/api/crm/tasks', { method: 'POST', body })
    toast.add({ title: t('crmTasks.created') })
    open.value = false
    emit('created')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmTasks.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('crmTasks.newTask')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <p class="crm-held">
          {{ t('crmTasks.completeHint') }}
        </p>
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="field">
          <label for="task-title">{{ t('crmTasks.titleField') }}</label>
          <input
            id="task-title"
            v-model="title"
            type="text"
          >
        </div>
        <div class="field">
          <label for="task-due">{{ t('crmTasks.due') }}</label>
          <AnkDateInput
            id="task-due"
            v-model="due"
          />
        </div>
        <div class="field">
          <label for="task-contact">{{ t('crmPipeline.contact') }}</label>
          <USelectMenu
            id="task-contact"
            v-model="contactId"
            v-model:search-term="searchTerm"
            class="w-full"
            value-key="value"
            ignore-filter
            :items="contactItems"
            :placeholder="t('crmPipeline.pickContact')"
            :search-input="{ placeholder: t('crmTasks.contactSearch') }"
            :reset-search-term-on-blur="false"
            :reset-search-term-on-select="false"
          >
            <template #empty>
              {{ searchTerm.trim().length < CONTACT_QUERY_MIN ? t('crmTasks.contactSearchHint') : (searching ? t('crmTasks.contactSearching') : t('crmTasks.contactNoMatch')) }}
            </template>
          </USelectMenu>
          <p class="field-hint">
            {{ t('crmTasks.contactSearchHint') }}
          </p>
        </div>
        <div class="field">
          <label for="task-deal">{{ t('crmTasks.dealOptional') }}</label>
          <USelect
            id="task-deal"
            v-model="dealId"
            class="w-full"
            :items="dealItems"
            :disabled="contactId === ''"
            :placeholder="contactId === '' ? t('crmTasks.dealNeedsContact') : t('crmTasks.dealNone')"
          />
        </div>
        <div
          v-if="canAssign"
          class="field"
        >
          <label for="task-owner">{{ t('crmPipeline.owner') }}</label>
          <USelect
            id="task-owner"
            v-model="ownerId"
            class="w-full"
            :items="ownerItems"
            :placeholder="t('crmTasks.ownerSelf')"
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
            :disabled="saving || title.trim() === '' || due === null || due === '' || contactId === ''"
          >
            {{ t('crmTasks.newTask') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
