<script setup lang="ts">
defineProps<{
  label: string
  count?: number
  max?: number
}>()
</script>

<template>
  <div class="field">
    <label>
      {{ label }}<span
        v-if="max !== undefined && count !== undefined"
        class="cnt"
      > · {{ count }} / {{ max }}</span>
    </label>
    <slot />
  </div>
</template>
