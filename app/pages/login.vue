<script setup lang="ts">
import { firstAllowedHome, sanitizeRedirect } from '../navigation/guards'
import { errorMessage, httpStatus } from '../utils/httpStatus'

definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const route = useRoute()
const { login, hasSection } = useAuth()

const email = ref('')
const password = ref('')
const submitting = ref(false)
const error = ref('')

const notice = computed(() => {
  return route.query.notice === 'password-changed' ? t('auth.passwordChanged') : ''
})

async function onSubmit(): Promise<void> {
  error.value = ''
  submitting.value = true

  try {
    await login(email.value.trim(), password.value)
    const next = sanitizeRedirect(route.query.redirect) ?? firstAllowedHome(id => hasSection(id))
    await navigateTo(next)
  } catch (caught: unknown) {
    if (httpStatus(caught) === 429) {
      error.value = t('auth.tooManyAttempts')
    } else {
      error.value = errorMessage(caught, t('auth.signInFailed'))
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AnkPanel :title="t('auth.signIn')">
    <form
      class="auth-form"
      @submit.prevent="onSubmit"
    >
      <p
        v-if="notice"
        class="notice"
      >
        {{ notice }}
      </p>
      <div
        v-if="error"
        class="warnbox"
      >
        {{ error }}
      </div>

      <UFormField :label="t('auth.email')">
        <UInput
          v-model="email"
          type="email"
          autocomplete="username"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('auth.password')">
        <UInput
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
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
          {{ t('auth.signIn') }}
        </UButton>
        <NuxtLink
          to="/forgot-password"
          class="auth-link"
        >
          {{ t('auth.forgotPassword') }}
        </NuxtLink>
      </div>
    </form>
  </AnkPanel>
</template>
