<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })

defineProps<{
  title: string
  body: string
  submitting: boolean
  error: string
  confirmLabel: string
  previewLabel?: string
}>()

const emit = defineEmits<{
  confirm: []
  preview: []
}>()

const { t } = useI18n()
</script>

<template>
  <UModal
    :open="open"
    :title="title"
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
          {{ body }}
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
            v-if="previewLabel !== undefined"
            variant="outline"
            :disabled="submitting"
            @click="emit('preview')"
          >
            {{ previewLabel }}
          </UButton>
          <UButton
            :loading="submitting"
            :disabled="submitting"
            @click="emit('confirm')"
          >
            {{ confirmLabel }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
