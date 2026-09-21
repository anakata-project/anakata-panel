<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [bankReference: string]
}>()

const { t } = useI18n()

const fieldId = useId()
const bankReference = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    bankReference.value = ''
  }
})
</script>

<template>
  <UModal
    :open="open"
    :title="t('payments.markReceivedTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="emit('submit', bankReference.trim())"
      >
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="field">
          <label :for="fieldId">
            {{ t('payments.bankReference') }}
            <span class="cnt">{{ t('bookings.reasonRequired') }}</span>
          </label>
          <input
            :id="fieldId"
            v-model="bankReference"
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
            :disabled="submitting || bankReference.trim() === ''"
          >
            {{ t('payments.markReceived') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
