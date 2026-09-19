<script setup lang="ts">
import { errorMessage, httpStatus } from '../utils/httpStatus'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const route = useRoute()
const { request } = useApi()

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
    await request('/api/auth/reset-password', {
      method: 'POST',
      body: {
        token: token.value,
        email: email.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value
      }
    })
    await navigateTo({ path: '/login', query: { notice: 'password-changed' } })
  } catch (caught: unknown) {
    if (httpStatus(caught) === 422) {
      expired.value = true
    } else {
      error.value = errorMessage(caught, t('auth.resetInvalid'))
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AnkPanel :title="t('auth.resetTitle')">
    <div
      v-if="invalid || expired"
      class="auth-form"
    >
      <div class="warnbox">
        {{ t('auth.resetInvalid') }}
        <NuxtLink
          to="/forgot-password"
          class="auth-link"
        >
          {{ t('auth.requestNewLink') }}
        </NuxtLink>
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
          {{ t('auth.submitReset') }}
        </UButton>
      </div>
    </form>
  </AnkPanel>
</template>
