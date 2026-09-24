<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <div class="auth-layout">
    <div class="auth-theme">
      <ShellLocaleSwitch />
      <AnkThemeToggle />
    </div>

    <div class="auth-column">
      <div class="brand">
        <img
          src="/brand/wordmark-dark.png"
          alt="ANAKATA"
          class="brand-mark--dark"
          draggable="false"
        >
        <img
          src="/brand/wordmark-light.png"
          alt="ANAKATA"
          class="brand-mark--light"
          draggable="false"
        >
        <small>{{ t('shell.brandRms') }}</small>
      </div>

      <slot />
    </div>
  </div>
</template>
