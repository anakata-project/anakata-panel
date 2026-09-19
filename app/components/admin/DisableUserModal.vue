<script setup lang="ts">
import type { DisableUserRequest, UserListItem } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'

const props = defineProps<{
  open: boolean
  user: UserListItem | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'disabled': []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const reason = ref('')
const submitting = ref(false)
const conflict = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reason.value = ''
    conflict.value = ''
  }
})

async function submit(): Promise<void> {
  if (!props.user) {
    return
  }

  conflict.value = ''
  submitting.value = true

  try {
    const body: DisableUserRequest = {}
    const trimmed = reason.value.trim()

    if (trimmed !== '') {
      body.reason = trimmed
    }

    await request(`/api/rms/users/${props.user.id}/disable`, {
      method: 'POST',
      body
    })

    toast.add({ title: t('admin.disabledToast') })
    emit('disabled')
    emit('update:open', false)
  } catch (error: unknown) {
    if (!applyApiFormError(error, (_fields, message) => {
      conflict.value = message
    })) {
      throw error
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('admin.disableTitle')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <div
          v-if="conflict"
          class="warnbox"
        >
          {{ conflict }}
        </div>
        <div class="warnbox">
          {{ t('admin.disableWarning') }}
        </div>
        <UFormField
          :label="t('admin.reason')"
          :hint="t('admin.reasonOptional')"
        >
          <UInput
            v-model="reason"
            class="w-full"
          />
        </UFormField>
        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            {{ t('admin.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ t('admin.disableSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
