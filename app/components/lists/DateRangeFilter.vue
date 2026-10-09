<script setup lang="ts">
import { calendarDateToIso, isoToCalendarDate } from '#anakata-ui/app/utils/calendarDate'
import {
  anchorToday,
  formatRangeDate,
  isRangeActive,
  matchingPreset,
  normalizeRange,
  resolveDateRange,
  shiftRange,
  type DateRangePreset,
  type DateRangeYacht
} from './dateRange'

const from = defineModel<string | null>('from', { required: true })
const to = defineModel<string | null>('to', { required: true })
const yachtId = defineModel<number | null>('yacht', { default: null })

const props = defineProps<{
  fieldLabel: string
  noun: string
  total: number
  today: string
  yachts?: Array<DateRangeYacht>
}>()

const { t } = useI18n()

const preset = ref<DateRangePreset>(matchingPreset(from.value, to.value, props.today))
const fromOpen = ref(false)
const toOpen = ref(false)

const active = computed(() => isRangeActive(from.value, to.value))
const canShift = computed(() => from.value !== null && to.value !== null)

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

const chips = computed(() => [
  { value: 'next30' as const, label: t('lists.presetNext30') },
  { value: 'next90' as const, label: t('lists.presetNext90') },
  { value: 'winter' as const, label: t('lists.presetWinter') },
  { value: 'custom' as const, label: t('lists.presetCustom') }
])

const yachtItems = computed(() => [
  {
    label: t('lists.allYachts', { count: String(props.yachts?.length ?? 0) }),
    value: 'all'
  },
  ...(props.yachts ?? []).map(yacht => ({
    label: yacht.name,
    value: String(yacht.id)
  }))
])

const yachtValue = computed(() => yachtId.value === null ? 'all' : String(yachtId.value))

watch([from, to, () => props.today], () => {
  preset.value = matchingPreset(from.value, to.value, props.today)
})

function applyPreset(next: DateRangePreset): void {
  if (next === 'custom') {
    const current = matchingPreset(from.value, to.value, props.today)
    preset.value = current === 'all' ? 'custom' : current
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
}

function pickedIso(value: unknown): string | null | undefined {
  if (value !== null && value !== undefined && (typeof value !== 'object' || !('toString' in value))) {
    return undefined
  }

  return calendarDateToIso(value as { toString(): string } | null | undefined)
}

async function onPick(which: 'from' | 'to', value: unknown): Promise<void> {
  const iso = pickedIso(value)

  if (iso === undefined) {
    return
  }

  onManual(which, iso)
  await nextTick()

  if (which === 'from') {
    fromOpen.value = false
    return
  }

  toOpen.value = false
}

function clear(): void {
  from.value = null
  to.value = null
  yachtId.value = null
}

function onYacht(value: string | number | null | undefined): void {
  if (value === null || value === undefined || value === '' || value === 'all') {
    yachtId.value = null
    return
  }

  const id = Number(value)
  yachtId.value = Number.isNaN(id) ? null : id
}

function shift(direction: -1 | 1): void {
  if (from.value === null || to.value === null) {
    return
  }

  const next = shiftRange(from.value, to.value, direction)
  from.value = next.from
  to.value = next.to
}

function goToday(): void {
  const next = anchorToday(from.value, to.value, props.today)
  from.value = next.from
  to.value = next.to
}

function dateLabel(value: string | null): string {
  return value === null ? '—' : formatRangeDate(value)
}
</script>

<template>
  <div
    class="drange"
    :class="{ 'is-filtered': active }"
  >
    <div class="drange-top">
      <div class="dr-lead">
        <span class="dr-kicker">{{ t('lists.rangeBy', { field: fieldLabel }) }}</span>
        <div
          class="dr-presets"
          role="group"
          :aria-label="t('lists.dateRange')"
        >
          <button
            v-for="chip in chips"
            :key="chip.value"
            type="button"
            class="dr-chip"
            :class="{ on: preset === chip.value }"
            :aria-pressed="preset === chip.value"
            @click="applyPreset(chip.value)"
          >
            {{ chip.label }}
          </button>
        </div>
      </div>

      <div class="dr-dates">
        <div class="dr-field">
          <span class="dr-kicker">{{ t('lists.fromShort') }}</span>
          <UPopover v-model:open="fromOpen">
            <button
              type="button"
              class="dr-date"
              :class="{ 'is-set': from !== null }"
              :aria-label="t('lists.from')"
            >
              <span>{{ dateLabel(from) }}</span>
              <UIcon
                name="i-lucide-calendar"
                class="dr-cal"
              />
            </button>
            <template #content>
              <UCalendar
                :model-value="isoToCalendarDate(from)"
                :max-value="isoToCalendarDate(to)"
                class="p-2"
                @update:model-value="onPick('from', $event)"
              />
            </template>
          </UPopover>
        </div>
        <span
          class="dr-arrow"
          aria-hidden="true"
        >→</span>
        <div class="dr-field">
          <span class="dr-kicker">{{ t('lists.toShort') }}</span>
          <UPopover v-model:open="toOpen">
            <button
              type="button"
              class="dr-date"
              :class="{ 'is-set': to !== null }"
              :aria-label="t('lists.to')"
            >
              <span>{{ dateLabel(to) }}</span>
              <UIcon
                name="i-lucide-calendar"
                class="dr-cal"
              />
            </button>
            <template #content>
              <UCalendar
                :model-value="isoToCalendarDate(to)"
                :min-value="isoToCalendarDate(from)"
                class="p-2"
                @update:model-value="onPick('to', $event)"
              />
            </template>
          </UPopover>
        </div>
      </div>
    </div>

    <div class="drange-bot">
      <div
        v-if="yachts !== undefined"
        class="dr-field"
      >
        <span class="dr-kicker">{{ t('lists.yacht') }}</span>
        <USelect
          size="sm"
          class="dr-yacht"
          :ui="{ base: 'normal-case! tracking-[.02em] text-[12px] bg-(--surface-2)' }"
          :model-value="yachtValue"
          :items="yachtItems"
          :aria-label="t('lists.yacht')"
          @update:model-value="onYacht"
        />
      </div>
      <button
        type="button"
        class="dr-chip"
        @click="clear"
      >
        {{ t('lists.clear') }}
      </button>
      <span class="mono drc">{{ countText }}</span>
      <div class="dr-nav">
        <button
          type="button"
          class="dr-chip dr-step"
          :disabled="!canShift"
          :aria-label="t('lists.previousRange')"
          @click="shift(-1)"
        >
          ‹
        </button>
        <button
          type="button"
          class="dr-chip is-today"
          @click="goToday"
        >
          {{ t('lists.today') }}
        </button>
        <button
          type="button"
          class="dr-chip dr-step"
          :disabled="!canShift"
          :aria-label="t('lists.nextRange')"
          @click="shift(1)"
        >
          ›
        </button>
      </div>
    </div>
  </div>
</template>
