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

function applyPreset(value: string): void {
  const next = value as DateRangePreset
  preset.value = next

  if (next === 'custom') {
    return
  }

  const range = resolveDateRange(next, props.today)
  from.value = range.from
  to.value = range.to
}

function onManual(which: 'from' | 'to', event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const value = target.value === '' ? null : target.value

  if (which === 'from') {
    from.value = value
  } else {
    to.value = value
  }

  const normalized = normalizeRange(from.value, to.value)
  from.value = normalized.from
  to.value = normalized.to
  preset.value = isRangeActive(from.value, to.value) ? 'custom' : 'all'
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
    <select
      class="drp"
      :aria-label="t('lists.dateRange')"
      :value="preset"
      @change="applyPreset(($event.target as HTMLSelectElement).value)"
    >
      <option value="all">
        {{ t('lists.presetAll') }}
      </option>
      <option value="last30">
        {{ t('lists.presetLast30') }}
      </option>
      <option value="last90">
        {{ t('lists.presetLast90') }}
      </option>
      <option value="next90">
        {{ t('lists.presetNext90') }}
      </option>
      <option value="next12">
        {{ t('lists.presetNext12') }}
      </option>
      <option
        v-for="year in years"
        :key="year.key"
        :value="year.key"
      >
        {{ t('lists.presetYear', { year: String(year.year) }) }}
      </option>
      <option value="custom">
        {{ t('lists.presetCustom') }}
      </option>
    </select>
    <div class="drio">
      <input
        class="drf"
        type="date"
        :aria-label="t('lists.from')"
        :value="from ?? ''"
        @change="onManual('from', $event)"
      >
      <span class="drarr">→</span>
      <input
        class="drt"
        type="date"
        :aria-label="t('lists.to')"
        :value="to ?? ''"
        @change="onManual('to', $event)"
      >
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
