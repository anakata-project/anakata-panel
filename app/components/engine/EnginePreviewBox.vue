<script setup lang="ts">
defineProps<{
  label: string
}>()

const { t } = useI18n()
</script>

<template>
  <div class="prevbox">
    <div class="mono prevl">
      {{ label }}
    </div>
    <p class="engine-preview-body">
      {{ t('engineSettings.previewBody') }}
    </p>
  </div>
</template>
