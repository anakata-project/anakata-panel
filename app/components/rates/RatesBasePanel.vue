<script setup lang="ts">
import type { RateCategoryKey, RoundTo } from './rateHelpers'
import {
  addNextYear,
  depositBalanceText,
  fillYearFromPrevious,
  RATE_CATEGORIES,
  RATES_DRAFT_KEY,
  removeLastYear,
  yoyLine
} from './rateHelpers'

defineProps<{
  canPublish: boolean
  errorsFor: (path: string) => Array<string>
}>()

const injected = inject(RATES_DRAFT_KEY)

if (injected === undefined) {
  throw new Error('RatesBasePanel requires a provided rates draft')
}

const draft = computed(() => {
  const value = injected.value

  if (value === null) {
    throw new Error('RatesBasePanel requires a rates draft')
  }

  return value
})

const { t } = useI18n()

const annualIncrease = ref(5)
const roundTo = ref<RoundTo>(1)

const lastYear = computed(() => {
  return draft.value.years[draft.value.years.length - 1]?.year ?? null
})

const roundItems: Array<{ value: RoundTo, label: string }> = [
  { value: 1, label: t('rates.roundUsd') },
  { value: 10, label: t('rates.round10') },
  { value: 50, label: t('rates.round50') },
  { value: 100, label: t('rates.round100') }
]

function pathFor(index: number, field: string): string {
  return `years.${index}.${field}`
}

function onIncreaseInput(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  if (target.value.trim() === '') {
    annualIncrease.value = 5
    return
  }

  const value = Number(target.value)

  if (!Number.isFinite(value)) {
    annualIncrease.value = 5
    return
  }

  annualIncrease.value = Math.min(50, Math.max(0, value))
}

function fillYear(year: number): void {
  draft.value.years = fillYearFromPrevious(
    draft.value.years,
    year,
    annualIncrease.value,
    roundTo.value
  )
}

function addYear(): void {
  draft.value.years = addNextYear(draft.value.years, annualIncrease.value, roundTo.value)
}

function removeYear(): void {
  draft.value.years = removeLastYear(draft.value.years)
}

function yoyFor(category: RateCategoryKey, index: number): string | null {
  if (index < 1) {
    return null
  }

  const row = draft.value.years[index]
  const previous = draft.value.years[index - 1]

  if (!row || !previous) {
    return null
  }

  return yoyLine(row[category], previous[category], previous.year)
}
</script>

<template>
  <AnkPanel :title="t('rates.baseTitle')">
    <template #actions>
      <AnkPill>{{ t('rates.adminDirector') }}</AnkPill>
    </template>

    <div class="rates-scroll">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('rates.category') }}</th>
            <th
              v-for="(row, index) in draft.years"
              :key="row.year"
              class="nw"
            >
              {{ row.year }}
              <button
                v-if="canPublish && index > 0"
                type="button"
                class="mini"
                :title="t('rates.fillTitle', { year: String(row.year), prev: String(draft.years[index - 1]?.year), n: String(annualIncrease) })"
                @click="fillYear(row.year)"
              >
                {{ t('rates.fill', { n: String(annualIncrease) }) }}
              </button>
              <button
                v-if="canPublish && index === draft.years.length - 1 && draft.years.length > 1"
                type="button"
                class="mini"
                :title="t('rates.removeTitle', { year: String(row.year) })"
                @click="removeYear"
              >
                ✕
              </button>
            </th>
            <th>{{ t('rates.depositBalance') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="category in RATE_CATEGORIES"
            :key="category.key"
          >
            <td>{{ t(category.labelKey) }}</td>
            <td
              v-for="(row, index) in draft.years"
              :key="`${category.key}-${row.year}`"
            >
              <div class="rcell">
                <span class="mono">USD</span>
                <ConfigNumberInput
                  v-model="row[category.key]"
                  :disabled="!canPublish"
                  :bad="errorsFor(pathFor(index, category.key)).length > 0"
                  min="1"
                  step="1"
                />
              </div>
              <div
                v-if="yoyFor(category.key, index)"
                class="yoy"
              >
                {{ yoyFor(category.key, index) }}
              </div>
            </td>
            <td class="nw">
              {{ depositBalanceText(draft.terms, category.kind) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="canPublish"
      class="rhelp"
    >
      <span class="mono">{{ t('rates.annualIncrease') }}</span>
      <input
        type="number"
        :value="annualIncrease"
        min="0"
        max="50"
        step="0.5"
        @change="onIncreaseInput"
      >
      <span>%</span>
      <span class="mono rates-round-label">{{ t('rates.roundTo') }}</span>
      <USelect
        v-model="roundTo"
        :items="roundItems"
      />
      <UButton
        variant="outline"
        class="rates-add"
        :disabled="lastYear === null"
        @click="addYear"
      >
        {{ t('rates.addYear', { year: String((lastYear ?? 0) + 1), n: String(annualIncrease) }) }}
      </UButton>
    </div>

    <p class="note">
      {{ t('rates.baseNote') }}
    </p>
  </AnkPanel>
</template>
