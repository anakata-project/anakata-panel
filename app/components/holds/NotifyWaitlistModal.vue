<script setup lang="ts">
import type { BookingFormOptions, PreferredChannel } from '../../types/api'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  options: BookingFormOptions | null
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [channel: PreferredChannel]
}>()

const { t } = useI18n()

const channel = ref<PreferredChannel>('EMAIL')

watch(open, (isOpen) => {
  if (isOpen) {
    channel.value = props.options?.preferred[0]?.value as PreferredChannel ?? 'EMAIL'
  }
})
</script>

<template>
  <UModal
    :open="open"
    :title="t('holds.notifyTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="emit('submit', channel)"
      >
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="field">
          <label>{{ t('bookings.preferredChannel') }}</label>
          <select
            :value="channel"
            @change="channel = ($event.target as HTMLSelectElement).value as PreferredChannel"
          >
            <option
              v-for="item in options?.preferred ?? []"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </option>
          </select>
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
            :disabled="submitting"
          >
            {{ t('holds.notifySubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
