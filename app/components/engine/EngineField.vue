<script setup lang="ts">
defineProps<{
  label: string
  count?: number
  max?: number
}>()

const fieldId = useId()
</script>

<template>
  <div class="field">
    <label :for="fieldId">
      {{ label }}<span
        v-if="max !== undefined && count !== undefined"
        class="cnt"
      > · {{ count }} / {{ max }}</span>
    </label>
    <slot :id="fieldId" />
  </div>
</template>
