<script setup lang="ts">
import type { ContactMergeResult, ContactProfile, ContactType } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { filterLabel, formatAttribution, segmentPillClass } from './contactHelpers'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  leftId: number | null
  rightId: number | null
  typeOptions: Array<{ value: string, label: string }>
  lifecycleOptions: Array<{ value: string, label: string }>
}>()

const emit = defineEmits<{
  merged: [result: ContactMergeResult]
}>()

const { t } = useI18n()
const { request } = useApi()
const { format: money } = useMoney()

const left = ref<ContactProfile | null>(null)
const right = ref<ContactProfile | null>(null)
const reason = ref('')
const warn = ref('')
const submitting = ref(false)
const reasonId = useId()

watch(
  () => [open.value, props.leftId, props.rightId] as const,
  async ([isOpen, leftId, rightId]) => {
    if (!isOpen || leftId === null || rightId === null) {
      return
    }

    reason.value = ''
    warn.value = ''
    left.value = await request(`/api/crm/contacts/${String(leftId)}`) as ContactProfile
    right.value = await request(`/api/crm/contacts/${String(rightId)}`) as ContactProfile
  }
)

const survivorId = computed(() => {
  if (props.leftId === null || props.rightId === null) {
    return null
  }

  return Math.min(props.leftId, props.rightId)
})

async function submit(): Promise<void> {
  if (props.leftId === null || props.rightId === null) {
    return
  }

  submitting.value = true
  warn.value = ''

  try {
    const result = await request(`/api/crm/contacts/${String(props.leftId)}/merge`, {
      method: 'POST',
      body: {
        contact_id: props.rightId,
        reason: reason.value.trim()
      }
    }) as ContactMergeResult

    emit('merged', result)
    open.value = false
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    submitting.value = false
  }
}

function typeLabel(value: ContactType): string {
  return filterLabel(props.typeOptions, value)
}

function lifecycleLabel(value: string): string {
  return filterLabel(props.lifecycleOptions, value)
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('crmContacts.mergeTitle')"
    class="crm-merge-modal"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>
        <p class="crm-held">
          {{ t('crmContacts.mergeSurvivor') }}
        </p>
        <div class="crm-merge-grid">
          <div
            v-for="(side, key) in [{ contact: left, label: t('crmContacts.mergeLeft') }, { contact: right, label: t('crmContacts.mergeRight') }]"
            :key="key"
            class="crm-merge-col"
          >
            <h4>
              {{ side.label }}
              <span
                v-if="side.contact && side.contact.id === survivorId"
                class="ro"
              >{{ t('crmContacts.mergeSwapped') }}</span>
            </h4>
            <template v-if="side.contact">
              <div class="kv">
                <span>{{ t('crmContacts.name') }}</span>
                <span>{{ side.contact.name }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.email') }}</span>
                <span>{{ side.contact.email ?? '—' }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.phone') }}</span>
                <span>{{ side.contact.phone ?? '—' }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.country') }}</span>
                <span>{{ side.contact.country ?? '—' }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.type') }}</span>
                <span>{{ typeLabel(side.contact.type) }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.colLifecycle') }}</span>
                <span>{{ lifecycleLabel(side.contact.lifecycle) }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.ltv') }}</span>
                <span>
                  {{ side.contact.lifetime_value === 0 ? '—' : money(side.contact.lifetime_value) }}
                  ·
                  <span
                    class="pill"
                    :class="segmentPillClass(side.contact.segment)"
                  >{{ side.contact.segment }}</span>
                </span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.firstTouch') }}</span>
                <span>{{ formatAttribution(side.contact.first_touch) }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.lastTouch') }}</span>
                <span>{{ formatAttribution(side.contact.last_touch) }}</span>
              </div>
              <div class="kv">
                <span>{{ t('crmContacts.bookingsTitle') }}</span>
                <span>{{ side.contact.bookings.length }}</span>
              </div>
            </template>
          </div>
        </div>
        <div class="field">
          <label :for="reasonId">
            {{ t('crmContacts.mergeReason') }}
            <span class="cnt">{{ t('bookings.reasonRequired') }}</span>
          </label>
          <textarea
            :id="reasonId"
            v-model="reason"
            rows="3"
          />
        </div>
        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting || reason.trim() === '' || left === null || right === null"
          >
            {{ t('crmContacts.mergeConfirm') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
