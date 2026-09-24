<script setup lang="ts">
import type { CrmContact, Paginated, TaskInput, UserListItem } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  created: []
}>()

const { t } = useI18n()
const { request } = useApi()
const { can } = useAuth()
const toast = useToast()

const title = ref('')
const due = ref('')
const query = ref('')
const matches = ref<Array<CrmContact>>([])
const contactId = ref('')
const dealId = ref('')
const ownerId = ref('')
const users = ref<Array<UserListItem>>([])
const saving = ref(false)
const error = ref('')

const canAssign = computed(() => can('records.act_on_any'))

const contactItems = computed(() => [
  { label: t('crmPipeline.pickContact'), value: '' },
  ...matches.value.map(contact => ({
    label: contact.name,
    value: String(contact.id)
  }))
])

const ownerItems = computed(() => [
  { label: t('crmTasks.ownerSelf'), value: '' },
  ...users.value.map(user => ({
    label: user.name,
    value: String(user.id)
  }))
])

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  title.value = ''
  due.value = ''
  query.value = ''
  matches.value = []
  contactId.value = ''
  dealId.value = ''
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
  if (title.value.trim() === '' || due.value === '' || contactId.value === '') {
    return
  }

  const body: TaskInput = {
    title: title.value.trim(),
    due_at: new Date(due.value).toISOString(),
    contact_id: Number(contactId.value)
  }

  if (dealId.value.trim() !== '') {
    body.deal_id = Number(dealId.value)
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
          <input
            id="task-due"
            v-model="due"
            type="datetime-local"
          >
        </div>
        <div class="field">
          <label for="task-contact">{{ t('crmPipeline.contact') }}</label>
          <div class="crm-inline">
            <input
              id="task-contact"
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
            :items="contactItems"
          />
        </div>
        <div class="field">
          <label for="task-deal">{{ t('crmTasks.dealOptional') }}</label>
          <input
            id="task-deal"
            v-model="dealId"
            type="number"
            min="1"
            step="1"
          >
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
            :disabled="saving || title.trim() === '' || due === '' || contactId === ''"
          >
            {{ t('crmTasks.newTask') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
