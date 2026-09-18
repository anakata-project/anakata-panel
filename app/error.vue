<script setup lang="ts">
const props = defineProps<{
  error: {
    statusCode?: number
    message?: string
  }
}>()

const { t } = useI18n()

function clear(): void {
  void clearError({ redirect: '/rms/reservations/calendar' })
}
</script>

<template>
  <UApp>
    <NuxtLayout>
      <AnkPanel :title="t('pages.notFound')">
        <p class="placeholder-copy">
          {{ props.error.message || t('pages.notFound') }}
        </p>
        <p class="placeholder-copy">
          <UButton
            color="primary"
            @click="clear"
          >
            {{ t('shell.rms') }}
          </UButton>
        </p>
      </AnkPanel>
    </NuxtLayout>
  </UApp>
</template>
