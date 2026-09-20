<script setup lang="ts">
import type { CellPresentation } from './calendarHelpers'

defineProps<{
  view: CellPresentation
}>()
</script>

<template>
  <NuxtLink
    v-if="view.href !== null"
    :to="view.href"
    class="cell"
    :class="view.cellClass"
    :title="view.title"
  >
    {{ view.label }}
  </NuxtLink>
  <div
    v-else
    class="cell"
    :class="view.cellClass"
    :title="view.title"
  >
    {{ view.label }}
  </div>
</template>
