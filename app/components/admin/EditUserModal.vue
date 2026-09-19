<script setup lang="ts">
import type { Role, UpdateUserRequest, UserListItem } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'

const props = defineProps<{
  open: boolean
  user: UserListItem | null
  roles: Array<Role>
  isSelf: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'saved': []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const name = ref('')
const roleId = ref<number | undefined>(undefined)
const submitting = ref(false)
const conflict = ref('')
const fieldErrors = ref<Record<string, string>>({})

const roleItems = computed(() => props.roles.map(role => ({
  label: role.name,
  value: role.id
})))

watch(() => [props.open, props.user] as const, ([isOpen, user]) => {
  if (isOpen && user) {
    name.value = user.name
    roleId.value = user.role.id
    conflict.value = ''
    fieldErrors.value = {}
  }
})

async function submit(): Promise<void> {
  if (!props.user) {
    return
  }

  conflict.value = ''
  fieldErrors.value = {}
  submitting.value = true

  try {
    const body: UpdateUserRequest = {
      name: name.value.trim()
    }

    if (!props.isSelf && roleId.value !== undefined) {
      body.role_id = roleId.value
    }

    await request(`/api/rms/users/${props.user.id}`, {
      method: 'PATCH',
      body
    })

    toast.add({ title: t('admin.savedToast') })
    emit('saved')
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
    :title="t('admin.editTitle')"
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
          :label="t('admin.role')"
          :error="fieldErrors.role_id"
        >
          <USelect
            v-model="roleId"
            :items="roleItems"
            :disabled="isSelf"
            class="w-full"
          />
          <p
            v-if="isSelf"
            class="field-hint"
          >
            {{ t('admin.ownRoleHint') }}
          </p>
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
