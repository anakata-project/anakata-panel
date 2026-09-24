<script setup lang="ts">
const { t, locale } = useI18n()
const { choose, applyStored, stored } = usePanelLocale()

useHead({
  htmlAttrs: {
    lang: locale
  }
})

function onChoose(code: 'en' | 'es'): void {
  void choose(code)
}

onMounted(() => {
  void applyStored()
})

defineExpose({
  choose,
  applyStored,
  stored
})
</script>

<template>
  <div
    class="panel-locale"
    role="group"
    :aria-label="t('shell.localeAria')"
  >
    <UButton
      color="neutral"
      variant="outline"
      class="panel-locale-btn"
      data-locale="en"
      :aria-pressed="locale === 'en'"
      @click="onChoose('en')"
    >
      EN
    </UButton>
    <UButton
      color="neutral"
      variant="outline"
      class="panel-locale-btn"
      data-locale="es"
      :aria-pressed="locale === 'es'"
      @click="onChoose('es')"
    >
      ES
    </UButton>
  </div>
</template>

<style scoped>
.panel-locale {
  display: flex;
}

.panel-locale-btn {
  padding: 9px 14px;
}

.panel-locale-btn[aria-pressed='true'] {
  color: var(--ivory);
  border-color: var(--ivory);
}
</style>
