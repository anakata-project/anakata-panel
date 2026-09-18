<script setup lang="ts">
type HealthResponse = {
  status: string
}

const { t } = useI18n()
const { request } = useApi()
const ok = ref(false)
const checked = ref(false)

async function ping(): Promise<void> {
  try {
    const data = await request('/api/health') as HealthResponse
    ok.value = data.status === 'ok'
  } catch {
    ok.value = false
  } finally {
    checked.value = true
  }
}

onMounted(() => {
  void ping()
  const timer = setInterval(() => {
    void ping()
  }, 30000)

  onUnmounted(() => {
    clearInterval(timer)
  })
})

const label = computed(() => {
  if (!checked.value) {
    return t('shell.apiDown')
  }

  return ok.value ? t('shell.apiOk') : t('shell.apiDown')
})
</script>

<template>
  <span
    class="api-status"
    :class="ok ? 'api-status--ok' : 'api-status--down'"
  >
    {{ label }}
  </span>
</template>
