<script setup lang="ts">
import type { InviteUserRequest, Role } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'

const props = defineProps<{
  open: boolean
  roles: Array<Role>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'invited': []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const name = ref('')
const email = ref('')
const roleId = ref<number | undefined>(undefined)
const submitting = ref(false)
const conflict = ref('')
const fieldErrors = ref<Record<string, string>>({})

const roleItems = computed(() => props.roles.map(role => ({
  label: role.name,
  value: role.id
})))

function reset(): void {
  name.value = ''
  email.value = ''
  roleId.value = undefined
  conflict.value = ''
  fieldErrors.value = {}
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reset()
  }
})

async function submit(): Promise<void> {
  if (roleId.value === undefined) {
    fieldErrors.value = { role_id: t('admin.role') }
    return
  }

  conflict.value = ''
  fieldErrors.value = {}
  submitting.value = true

  try {
    const body: InviteUserRequest = {
      name: name.value.trim(),
      email: email.value.trim(),
      role_id: roleId.value
    }

    await request('/api/rms/users', {
      method: 'POST',
      body
    })

    toast.add({ title: t('admin.invitedToast') })
    emit('invited')
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
    :title="t('admin.inviteTitle')"
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
          {{ t('admin.inviteNotice') }}
        </p>
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
          :label="t('admin.email')"
          :error="fieldErrors.email"
        >
          <UInput
            v-model="email"
            type="email"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField
          :label="t('admin.role')"
          :error="fieldErrors.role_id"
        >
          <USelect
            v-model="roleId"
            :items="roleItems"
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
            {{ t('admin.inviteSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
