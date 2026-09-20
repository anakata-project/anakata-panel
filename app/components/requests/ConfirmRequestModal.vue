<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  depositPct: number
  channel: string
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <UModal
    :open="open"
    :title="t('requests.confirmTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <div class="modal-form">
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <p class="notice">
          {{ t('requests.confirmBody', { pct: String(depositPct), channel }) }}
        </p>
        <p class="notice">
          {{ t('requests.confirmSprint') }}
        </p>
        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            :loading="submitting"
            :disabled="submitting"
            @click="emit('confirm')"
          >
            {{ t('requests.confirmSubmit') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
