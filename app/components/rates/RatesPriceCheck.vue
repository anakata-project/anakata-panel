<script setup lang="ts">
import type { NoRate, PriceCheckRow, Quote } from '../../types/api'
import { isNoRate } from './isNoRate'

defineProps<{
  years: Array<number>
  year: number | null
  rows: Array<PriceCheckRow>
  stale: boolean
}>()

const emit = defineEmits<{
  'update:year': [value: number]
}>()

const { t } = useI18n()
const { format } = useMoney()

function onYearChange(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLSelectElement)) {
    return
  }

  emit('update:year', Number(target.value))
}

function publishedText(value: Quote | NoRate): string {
  return isNoRate(value) ? '—' : format(value.total)
}

function draftText(value: Quote | NoRate): string {
  return isNoRate(value) ? t('rates.noRate') : format(value.total)
}

function draftClass(value: Quote | NoRate): string {
  return isNoRate(value) ? 'price-check-none' : ''
}

function differenceText(difference: number | null): string {
  if (difference === null) {
    return '—'
  }

  if (difference === 0) {
    return t('rates.noChange')
  }

  const sign = difference > 0 ? '+' : '−'

  return `${sign}${format(Math.abs(difference))}`
}

function differenceClass(difference: number | null): string {
  if (difference === null || difference === 0) {
    return 'price-check-same'
  }

  return difference > 0 ? 'price-check-up' : 'price-check-down'
}
</script>

<template>
  <AnkPanel :title="t('rates.priceCheckTitle')">
    <div class="rhelp rates-year-help">
      <span class="mono">{{ t('rates.sailingYear') }}</span>
      <select
        :value="year ?? undefined"
        @change="onYearChange"
      >
        <option
          v-for="item in years"
          :key="item"
          :value="item"
        >
          {{ item }}
        </option>
      </select>
    </div>

    <p
      v-if="stale"
      class="note"
    >
      {{ t('rates.priceCheckStale') }}
    </p>

    <div
      class="rates-scroll"
      :class="{ 'price-check-dimmed': stale }"
    >
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('rates.scenario') }}</th>
            <th>{{ t('rates.published') }}</th>
            <th>{{ t('rates.draftCol') }}</th>
            <th>{{ t('rates.difference') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.key"
          >
            <td>{{ row.label }}</td>
            <td>{{ publishedText(row.published) }}</td>
            <td :class="draftClass(row.draft)">
              {{ draftText(row.draft) }}
            </td>
            <td :class="differenceClass(row.difference)">
              {{ differenceText(row.difference) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AnkPanel>
</template>
