<script setup lang="ts">
import {
  isRangeActive,
  normalizeRange,
  resolveDateRange,
  yearPresets,
  type DateRangePreset
} from './dateRange'

const from = defineModel<string | null>('from', { required: true })
const to = defineModel<string | null>('to', { required: true })

const props = defineProps<{
  fieldLabel: string
  noun: string
  total: number
  today: string
}>()

const { t } = useI18n()

const preset = ref<DateRangePreset>(isRangeActive(from.value, to.value) ? 'custom' : 'all')

const years = computed(() => yearPresets(props.today))
const active = computed(() => isRangeActive(from.value, to.value))

const countText = computed(() => {
  if (active.value) {
    return t('lists.rangeShowing', {
      total: String(props.total),
      noun: props.noun
    })
  }

  return t('lists.rangeAll', {
    total: String(props.total),
    noun: props.noun
  })
})

const presetItems = computed(() => [
  { label: t('lists.presetAll'), value: 'all' },
  { label: t('lists.presetLast30'), value: 'last30' },
  { label: t('lists.presetLast90'), value: 'last90' },
  { label: t('lists.presetNext90'), value: 'next90' },
  { label: t('lists.presetNext12'), value: 'next12' },
  ...years.value.map(year => ({
    label: t('lists.presetYear', { year: String(year.year) }),
    value: year.key
  })),
  { label: t('lists.presetCustom'), value: 'custom' }
])

function applyPreset(value: string | number | null | undefined): void {
  if (typeof value !== 'string') {
    return
  }

  const next = value as DateRangePreset
  preset.value = next

  if (next === 'custom') {
    return
  }

  const range = resolveDateRange(next, props.today)
  from.value = range.from
  to.value = range.to
}

function onManual(which: 'from' | 'to', value: string | null): void {
  const nextFrom = which === 'from' ? value : from.value
  const nextTo = which === 'to' ? value : to.value

  if (nextFrom === from.value && nextTo === to.value) {
    return
  }

  const normalized = normalizeRange(nextFrom, nextTo)
  from.value = normalized.from
  to.value = normalized.to
  preset.value = isRangeActive(normalized.from, normalized.to) ? 'custom' : 'all'
}

function clear(): void {
  preset.value = 'all'
  from.value = null
  to.value = null
}
</script>

<template>
  <div
    class="drbar"
    :class="{ active }"
  >
    <div class="drl">
      <span class="mono">{{ t('lists.dateRange') }}</span>
      <span class="drb">{{ fieldLabel }}</span>
    </div>
    <USelect
      size="sm"
      :model-value="preset"
      :items="presetItems"
      :aria-label="t('lists.dateRange')"
      @update:model-value="applyPreset"
    />
    <div class="drio">
      <AnkDateInput
        size="sm"
        :model-value="from"
        :aria-label="t('lists.from')"
        @update:model-value="onManual('from', $event)"
      />
      <span class="drarr">→</span>
      <AnkDateInput
        size="sm"
        :model-value="to"
        :aria-label="t('lists.to')"
        @update:model-value="onManual('to', $event)"
      />
    </div>
    <UButton
      class="drx"
      variant="outline"
      @click="clear"
    >
      {{ t('lists.clear') }}
    </UButton>
    <span class="mono drc">{{ countText }}</span>
  </div>
</template>
