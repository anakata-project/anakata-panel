<script setup lang="ts">
import type { Permission, Role, StoreRoleRequest } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'

const props = defineProps<{
  open: boolean
  roles: Array<Role>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const name = ref('')
const description = ref('')
const copyFrom = ref<number | 'none'>('none')
const submitting = ref(false)
const conflict = ref('')
const fieldErrors = ref<Record<string, string>>({})

const copyItems = computed(() => [
  { label: t('admin.copyNone'), value: 'none' as const },
  ...props.roles.map(role => ({
    label: role.name,
    value: role.id
  }))
])

function reset(): void {
  name.value = ''
  description.value = ''
  copyFrom.value = 'none'
  conflict.value = ''
  fieldErrors.value = {}
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reset()
  }
})

async function submit(): Promise<void> {
  conflict.value = ''
  fieldErrors.value = {}
  submitting.value = true

  try {
    const body: StoreRoleRequest = {
      name: name.value.trim()
    }

    const trimmed = description.value.trim()

    if (trimmed !== '') {
      body.description = trimmed
    }

    if (copyFrom.value !== 'none') {
      const source = props.roles.find(role => role.id === copyFrom.value)
      body.permissions = (source?.permissions ?? []) as Array<Permission>
    }

    await request('/api/rms/roles', {
      method: 'POST',
      body
    })

    toast.add({ title: t('admin.roleCreatedToast') })
    emit('created')
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
    :title="t('admin.newRoleTitle')"
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
        <UFormField
          :label="t('admin.roleDescription')"
          :error="fieldErrors.description"
        >
          <UInput
            v-model="description"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('admin.copyPermissions')">
          <USelect
            v-model="copyFrom"
            :items="copyItems"
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
            {{ t('admin.newRoleSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
