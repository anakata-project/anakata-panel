<script setup lang="ts">
import { parseRinValue } from '../../utils/parseRinValue'

const props = withDefaults(defineProps<{
  modelValue: number | null
  disabled?: boolean
  bad?: boolean
  variant?: 'rin' | 'field'
  min?: number | string
  max?: number | string
  step?: number | string
  id?: string
  ariaLabel?: string
}>(), {
  variant: 'rin'
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'change': []
}>()

const display = computed(() => {
  return props.modelValue === null ? '' : String(props.modelValue)
})

const inputEl = useTemplateRef<HTMLInputElement>('inputEl')

function onInput(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  emit('update:modelValue', parseRinValue(target.value))
}

function focus(): void {
  inputEl.value?.focus()
}

defineExpose({ focus })
</script>

<template>
  <input
    :id="id"
    ref="inputEl"
    type="number"
    :class="[variant === 'rin' ? 'rin' : null, { bad }]"
    :value="display"
    :min="min"
    :max="max"
    :step="step"
    :disabled="disabled"
    :aria-label="ariaLabel"
    @input="onInput"
    @change="emit('change')"
  >
</template>
