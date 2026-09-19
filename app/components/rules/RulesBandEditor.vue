<script setup lang="ts">
import {
  addBand,
  MAX_BANDS,
  removeBand,
  ruleFieldMeta,
  sortBands,
  RULES_DRAFT_KEY
} from './rulesHelpers'

defineProps<{
  canEdit: boolean
  errorsFor: (path: string) => Array<string>
}>()

const injected = inject(RULES_DRAFT_KEY)

if (injected === undefined) {
  throw new Error('RulesBandEditor requires a provided business-rules draft')
}

const draft = computed(() => {
  const value = injected.value

  if (value === null) {
    throw new Error('RulesBandEditor requires a business-rules draft')
  }

  return value
})

const { t } = useI18n()

const daysMeta = ruleFieldMeta('cancellation.bands.min_days')
const pctMeta = ruleFieldMeta('cancellation.bands.penalty_pct')

function daysPath(index: number): string {
  return `cancellation.bands.${index}.min_days`
}

function pctPath(index: number): string {
  return `cancellation.bands.${index}.penalty_pct`
}

function setDays(index: number, value: number | null): void {
  const band = draft.value.cancellation.bands[index]

  if (band) {
    band.min_days = value
  }
}

function setPct(index: number, value: number | null): void {
  const band = draft.value.cancellation.bands[index]

  if (band) {
    band.penalty_pct = value
  }
}

function commitSort(): void {
  draft.value.cancellation.bands = sortBands(draft.value.cancellation.bands)
}

function onAdd(): void {
  draft.value.cancellation.bands = addBand(draft.value.cancellation.bands)
}

function onRemove(index: number): void {
  draft.value.cancellation.bands = removeBand(draft.value.cancellation.bands, index)
}
</script>

<template>
  <div class="bands">
    <div
      v-for="(band, index) in draft.cancellation.bands"
      :key="index"
      class="rcell"
    >
      <span class="mono">≥</span>
      <ConfigNumberInput
        :model-value="band.min_days"
        :min="daysMeta?.min"
        :max="daysMeta?.max"
        :disabled="!canEdit"
        :bad="errorsFor(daysPath(index)).length > 0 || errorsFor('cancellation.bands').length > 0"
        @update:model-value="setDays(index, $event)"
        @change="commitSort"
      />
      <span class="mono">{{ t('businessRules.daysTo') }}</span>
      <ConfigNumberInput
        :model-value="band.penalty_pct"
        :min="pctMeta?.min"
        :max="pctMeta?.max"
        :disabled="!canEdit"
        :bad="errorsFor(pctPath(index)).length > 0 || errorsFor('cancellation.bands').length > 0"
        @update:model-value="setPct(index, $event)"
      />
      <span class="mono">%</span>
      <button
        v-if="canEdit && draft.cancellation.bands.length > 1"
        type="button"
        class="mini"
        :title="t('businessRules.removeBandTitle')"
        @click="onRemove(index)"
      >
        {{ t('businessRules.removeBand') }}
      </button>
    </div>
    <button
      v-if="canEdit && draft.cancellation.bands.length < MAX_BANDS"
      type="button"
      class="mini"
      @click="onAdd"
    >
      {{ t('businessRules.addBand') }}
    </button>
    <div class="yoy">
      {{ t('businessRules.bandNote') }}
    </div>
  </div>
</template>
