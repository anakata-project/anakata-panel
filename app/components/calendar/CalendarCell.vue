<script setup lang="ts">
import type { CellPresentation } from './calendarHelpers'

const props = defineProps<{
  view: CellPresentation
}>()

const emit = defineEmits<{
  activate: []
}>()

const clickable = computed(() => {
  return props.view.action.type === 'open' || props.view.action.type === 'free'
})
</script>

<template>
  <NuxtLink
    v-if="view.action.type === 'block' && view.href !== null"
    :to="view.href"
    class="cell"
    :class="view.cellClass"
    :title="view.title"
  >
    {{ view.label }}
  </NuxtLink>
  <button
    v-else-if="clickable"
    type="button"
    class="cell"
    :class="view.cellClass"
    :title="view.title"
    @click="emit('activate')"
  >
    {{ view.label }}
  </button>
  <div
    v-else
    class="cell"
    :class="view.cellClass"
    :title="view.title"
  >
    {{ view.label }}
  </div>
</template>
