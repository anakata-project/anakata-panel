<script setup lang="ts">
definePageMeta({
  layout: 'auth'
})

const { t } = useI18n()
const { logout } = useAuth()
</script>

<template>
  <AnkPanel :title="t('auth.noAccessTitle')">
    <div class="auth-form">
      <p class="notice">
        {{ t('auth.noAccessBody') }}
      </p>
      <div class="auth-actions">
        <UButton
          color="primary"
          class="w-full"
          @click="logout"
        >
          {{ t('shell.signOut') }}
        </UButton>
      </div>
    </div>
  </AnkPanel>
</template>
