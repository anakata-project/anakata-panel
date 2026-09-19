<script setup lang="ts">
import type { Role } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'

const props = defineProps<{
  open: boolean
  role: Role | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'deleted': []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const submitting = ref(false)
const conflict = ref('')

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    conflict.value = ''
  }
})

async function submit(): Promise<void> {
  if (!props.role) {
    return
  }

  conflict.value = ''
  submitting.value = true

  try {
    await request(`/api/rms/roles/${props.role.id}`, {
      method: 'DELETE'
    })

    toast.add({ title: t('admin.deletedToast') })
    emit('deleted')
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
    :title="t('admin.deleteTitle')"
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
        <p class="notice">
          {{ t('admin.deleteConfirm') }}
        </p>
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
            {{ t('admin.delete') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
