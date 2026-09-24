<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  amount: number
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [payload: { paid_on: string, bank_reference: string }]
}>()

const { t } = useI18n()
const { format } = useDates()
const { format: money } = useMoney()

const dateId = useId()
const referenceId = useId()
const paidOn = ref<string | null>(null)
const bankReference = ref('')

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  paidOn.value = format(new Date(), 'iso')
  bankReference.value = ''
})

const canSubmit = computed(() => paidOn.value !== null && paidOn.value !== '' && bankReference.value.trim() !== '' && !props.submitting)

function submit(): void {
  if (!canSubmit.value || paidOn.value === null) {
    return
  }

  emit('submit', {
    paid_on: paidOn.value,
    bank_reference: bankReference.value.trim()
  })
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('agencies.payoutTitle')"
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
          <label>{{ t('agencies.payoutAmount') }}</label>
          <input
            :value="money(amount)"
            type="text"
            readonly
          >
        </div>
        <div class="field">
          <label :for="dateId">{{ t('agencies.payoutDate') }}</label>
          <AnkDateInput
            :id="dateId"
            v-model="paidOn"
          />
        </div>
        <div class="field">
          <label :for="referenceId">{{ t('agencies.payoutReference') }}</label>
          <input
            :id="referenceId"
            v-model="bankReference"
            type="text"
            required
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
            :disabled="!canSubmit"
          >
            {{ t('agencies.payoutSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
