<script setup lang="ts">
import type { PaymentOption } from '../../types/api'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  amount: number
  methods: Array<PaymentOption>
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [payload: { method: string, reference: string | null }]
}>()

const { t } = useI18n()
const { format: money } = useMoney()

const methodId = useId()
const referenceId = useId()
const method = ref('')
const reference = ref('')

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  method.value = props.methods[0]?.value ?? ''
  reference.value = ''
})

function submit(): void {
  if (method.value === '') {
    return
  }

  const trimmed = reference.value.trim()

  emit('submit', {
    method: method.value,
    reference: trimmed === '' ? null : trimmed
  })
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('refunds.executeTitle')"
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
        <p class="notice">
          {{ t('refunds.executeNote') }}
        </p>
        <div class="field">
          <label :for="methodId">{{ t('refunds.executeMethod') }}</label>
          <select
            :id="methodId"
            v-model="method"
          >
            <option
              v-for="item in methods"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('refunds.executeAmount') }}</label>
          <input
            :value="money(amount)"
            type="text"
            readonly
          >
        </div>
        <div class="field">
          <label :for="referenceId">
            {{ t('refunds.executeReference') }}
            <span class="cnt">{{ t('refunds.executeReferenceHint') }}</span>
          </label>
          <input
            :id="referenceId"
            v-model="reference"
            type="text"
          >
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
            :disabled="submitting || method === ''"
          >
            {{ t('refunds.executeSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
