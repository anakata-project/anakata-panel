<script setup lang="ts">
import type { ActivityInput } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  contactId: number | null
  dealId?: number | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const KINDS: Array<ActivityInput['kind']> = ['CALL', 'EMAIL', 'MEETING', 'NOTE']

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const kind = ref<ActivityInput['kind']>('NOTE')
const body = ref('')
const saving = ref(false)
const error = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    kind.value = 'NOTE'
    body.value = ''
    error.value = ''
  }
})

async function submit(): Promise<void> {
  if (props.contactId === null || body.value.trim() === '') {
    return
  }

  saving.value = true
  error.value = ''

  try {
    await request(`/api/crm/contacts/${String(props.contactId)}/activities`, {
      method: 'POST',
      body: {
        kind: kind.value,
        body: body.value.trim(),
        deal_id: props.dealId ?? null
      }
    })
    toast.add({ title: t('crmPipeline.activitySaved') })
    open.value = false
    emit('saved')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmPipeline.activityFailed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('crmPipeline.logActivity')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <p class="crm-held">
          {{ t('crmPipeline.activityWhen') }}
        </p>
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="field">
          <label for="activity-kind">{{ t('crmPipeline.activityKind') }}</label>
          <select
            id="activity-kind"
            v-model="kind"
          >
            <option
              v-for="item in KINDS"
              :key="item"
              :value="item"
            >
              {{ t(`crmPipeline.kinds.${item}`) }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="activity-body">{{ t('crmPipeline.activityText') }}</label>
          <textarea
            id="activity-body"
            v-model="body"
            rows="4"
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
            :disabled="saving || body.trim() === ''"
          >
            {{ t('crmPipeline.logActivity') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
