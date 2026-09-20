<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  title: string
  hint: 'required' | 'optional'
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [reason: string]
}>()

const { t } = useI18n()

const reasonId = useId()
const reason = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    reason.value = ''
  }
})
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="emit('submit', reason.trim())"
      >
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="field">
          <label :for="reasonId">
            {{ t('bookings.reason') }}
            <span class="cnt">
              {{ hint === 'required' ? t('bookings.reasonRequired') : t('bookings.reasonOptional') }}
            </span>
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
            :disabled="submitting || (hint === 'required' && reason.trim() === '')"
          >
            {{ t('bookings.reasonSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
