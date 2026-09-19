<script setup lang="ts">
import { firstAllowedHome } from '../navigation/guards'
import { errorMessage, httpStatus } from '../utils/httpStatus'
import type { Me } from '../types/api'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const route = useRoute()
const { request } = useApi()
const { setUser, hasSection } = useAuth()

const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')
const email = computed(() => typeof route.query.email === 'string' ? route.query.email : '')
const invalid = computed(() => token.value === '' || email.value === '')

const password = ref('')
const passwordConfirmation = ref('')
const submitting = ref(false)
const error = ref('')
const expired = ref(false)

async function onSubmit(): Promise<void> {
  if (invalid.value) {
    expired.value = true
    return
  }

  error.value = ''
  submitting.value = true

  try {
    const me = await request('/api/auth/accept-invitation', {
      method: 'POST',
      body: {
        token: token.value,
        email: email.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value
      }
    }) as Me

    setUser(me)
    clearNuxtData()
    await navigateTo(firstAllowedHome(id => hasSection(id)))
  } catch (caught: unknown) {
    if (httpStatus(caught) === 422) {
      expired.value = true
    } else {
      error.value = errorMessage(caught, t('auth.inviteExpired'))
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AnkPanel :title="t('auth.acceptTitle')">
    <div
      v-if="invalid || expired"
      class="auth-form"
    >
      <div class="warnbox">
        {{ t('auth.inviteExpired') }}
      </div>
    </div>

    <form
      v-else
      class="auth-form"
      @submit.prevent="onSubmit"
    >
      <div
        v-if="error"
        class="warnbox"
      >
        {{ error }}
      </div>

      <p class="auth-hint">
        {{ t('auth.resetHint') }}
      </p>

      <UFormField :label="t('auth.password')">
        <UInput
          v-model="password"
          type="password"
          autocomplete="new-password"
          required
            minlength="8"
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('auth.passwordConfirm')">
        <UInput
          v-model="passwordConfirmation"
          type="password"
          autocomplete="new-password"
          required
            minlength="8"
          class="w-full"
        />
      </UFormField>

      <div class="auth-actions">
        <UButton
          type="submit"
          color="primary"
          class="w-full"
          :loading="submitting"
          :disabled="submitting"
        >
          {{ t('auth.submitAccept') }}
        </UButton>
      </div>
    </form>
  </AnkPanel>
</template>
