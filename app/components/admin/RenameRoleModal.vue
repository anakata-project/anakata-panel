<script setup lang="ts">
import type { Role, UpdateRoleRequest } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'

const props = defineProps<{
  open: boolean
  role: Role | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'renamed': []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const name = ref('')
const submitting = ref(false)
const conflict = ref('')
const fieldErrors = ref<Record<string, string>>({})

watch(() => [props.open, props.role] as const, ([isOpen, role]) => {
  if (isOpen && role) {
    name.value = role.name
    conflict.value = ''
    fieldErrors.value = {}
  }
})

async function submit(): Promise<void> {
  if (!props.role) {
    return
  }

  conflict.value = ''
  fieldErrors.value = {}
  submitting.value = true

  try {
    const body: UpdateRoleRequest = {
      name: name.value.trim()
    }

    await request(`/api/rms/roles/${props.role.id}`, {
      method: 'PATCH',
      body
    })

    toast.add({ title: t('admin.renamedToast') })
    emit('renamed')
    emit('update:open', false)
  } catch (error: unknown) {
    if (!applyApiFormError(error, (fields, message) => {
      fieldErrors.value = fields
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
    :title="t('admin.renameTitle')"
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
        <UFormField
          :label="t('admin.name')"
          :error="fieldErrors.name"
        >
          <UInput
            v-model="name"
            required
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
            {{ t('admin.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
