<script setup lang="ts">
import { parseRinValue } from '../../utils/parseRinValue'

const props = defineProps<{
  modelValue: number | null
  disabled?: boolean
  bad?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const display = computed(() => {
  return props.modelValue === null ? '' : String(props.modelValue)
})

function onInput(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  emit('update:modelValue', parseRinValue(target.value))
}
</script>

<template>
  <input
    type="number"
    class="rin"
    :class="{ bad }"
    :value="display"
    :disabled="disabled"
    @input="onInput"
  >
</template>
