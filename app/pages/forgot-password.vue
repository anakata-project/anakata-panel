<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const { request } = useApi()

const email = ref('')
const submitting = ref(false)
const sent = ref(false)

async function onSubmit(): Promise<void> {
  submitting.value = true

  try {
    await request('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value.trim() }
    })
  } catch {
    // Always the same confirmation — do not distinguish success from failure.
  } finally {
    sent.value = true
    submitting.value = false
  }
}
</script>

<template>
  <AnkPanel :title="t('auth.forgotTitle')">
    <form
      class="auth-form"
      @submit.prevent="onSubmit"
    >
      <p
        v-if="sent"
        class="notice"
      >
        {{ t('auth.forgotConfirm') }}
      </p>

      <UFormField :label="t('auth.email')">
        <UInput
          v-model="email"
          type="email"
          autocomplete="username"
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
          {{ t('auth.sendReset') }}
        </UButton>
      </div>

      <NuxtLink
        to="/login"
        class="auth-link"
      >
        {{ t('auth.backToSignIn') }}
      </NuxtLink>
    </form>
  </AnkPanel>
</template>
