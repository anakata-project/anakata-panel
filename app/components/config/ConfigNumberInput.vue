<script setup lang="ts">
import { parseRinValue } from '../../utils/parseRinValue'

const props = withDefaults(defineProps<{
  modelValue: number | null
  disabled?: boolean
  bad?: boolean
  variant?: 'rin' | 'field'
}>(), {
  variant: 'rin'
})

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
    :class="[variant === 'rin' ? 'rin' : null, { bad }]"
    :value="display"
    :disabled="disabled"
    @input="onInput"
  >
</template>
