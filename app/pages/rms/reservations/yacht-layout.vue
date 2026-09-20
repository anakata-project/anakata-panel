<script setup lang="ts">
import type { CalendarGrid, CalendarRow } from '../../../types/api'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import { addMonths } from '../../../components/lists/dateRange'
import {
  cellAt,
  deckCabinName,
  deckCabinOrder,
  departureDateOptions,
  groupColumnsByDate,
  mapCabinCell,
  retainSelectedDate,
  yachtSections
} from '../../../components/calendar/calendarHelpers'

const { t } = useI18n()
const { useFetch } = useApi()
const { format } = useDates()

const todayIso = format(new Date(), 'iso')
const today = computed(() => format(new Date(), 'iso'))
const from = ref<string | null>(todayIso)
const to = ref<string | null>(addMonths(todayIso, 6))
const selectedDate = ref<string | null>(null)

const calendarUrl = computed(() => {
  const params = new URLSearchParams()

  if (from.value !== null) {
    params.set('from', from.value)
  }

  if (to.value !== null) {
    params.set('to', to.value)
  }

  const query = params.toString()

  return query === '' ? '/api/rms/calendar' : `/api/rms/calendar?${query}`
})

const { data: grid } = useFetch<CalendarGrid>(calendarUrl)

const departures = computed(() => grid.value?.departures ?? [])
const options = computed(() => departureDateOptions(departures.value))
const columns = computed(() => groupColumnsByDate(departures.value))
const sections = computed(() => yachtSections(grid.value?.rows ?? []))
const total = computed(() => departures.value.length)

const selectedColumn = computed(() => {
  return columns.value.find(column => column.date === selectedDate.value) ?? null
})

watch(
  () => options.value.map(option => option.date),
  (dates) => {
    selectedDate.value = retainSelectedDate(selectedDate.value, dates)
  },
  { immediate: true }
)

function optionLabel(date: string, festive: boolean): string {
  const formatted = format(date, 'short')

  return festive ? `${formatted} · ${t('yachtLayout.festive')}` : formatted
}

function cabinPresentation(row: CalendarRow) {
  const column = selectedColumn.value

  if (column === null) {
    return mapCabinCell({
      state: null,
      claim: null,
      cabinLabel: row.cabin.label,
      dateLabel: '',
      yachtName: row.yacht.name
    })
  }

  const cell = cellAt(row, column)

  return mapCabinCell({
    state: cell?.state ?? null,
    claim: cell?.claim ?? null,
    cabinLabel: row.cabin.label,
    dateLabel: format(column.date, 'short'),
    yachtName: row.yacht.name
  })
}

function sailing(sectionYachtId: number): boolean {
  return selectedColumn.value?.departuresByYachtId[sectionYachtId] !== undefined
}

function ordered(rows: Array<CalendarRow>): Array<CalendarRow> {
  return deckCabinOrder(rows)
}

function cabinClasses(row: CalendarRow): Array<string> {
  return [
    row.cabin.code === 'OWNER' ? 'owner' : '',
    cabinPresentation(row).deckClass
  ]
}

function cabinStatus(row: CalendarRow, yachtId: number): string {
  if (!sailing(yachtId)) {
    return ''
  }

  return cabinPresentation(row).deckStatus
}
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="t('yachtLayout.fieldLabel')"
      :noun="t('yachtLayout.noun')"
      :total="total"
      :today="today"
    />

    <div class="field yl-select">
      <label for="ylsel">{{ t('yachtLayout.departure') }}</label>
      <select
        id="ylsel"
        :value="selectedDate ?? ''"
        :disabled="options.length === 0"
        @change="selectedDate = ($event.target as HTMLSelectElement).value || null"
      >
        <option
          v-if="options.length === 0"
          value=""
        >
          {{ t('yachtLayout.empty') }}
        </option>
        <option
          v-for="option in options"
          :key="option.date"
          :value="option.date"
        >
          {{ optionLabel(option.date, option.festive) }}
        </option>
      </select>
    </div>

    <div class="layoutwrap">
      <div
        v-for="section in sections"
        :key="section.yacht.id"
        class="deck"
        :class="{ 'no-sail': !sailing(section.yacht.id) }"
      >
        <div class="mono deck-hdr">
          {{ t('yachtLayout.deckHeader', {
            yacht: section.yacht.name,
            date: selectedDate === null ? '—' : format(selectedDate, 'short')
          }) }}
        </div>
        <p
          v-if="!sailing(section.yacht.id)"
          class="no-sail-label"
        >
          {{ t('yachtLayout.noSailing') }}
        </p>
        <div class="bow" />
        <div class="dg">
          <div
            v-for="row in ordered(section.rows)"
            :key="row.cabin.id"
            class="cab"
            :class="cabinClasses(row)"
          >
            <div class="cn">
              {{ deckCabinName(row.cabin.label) }}
            </div>
            <div class="st">
              {{ cabinStatus(row, section.yacht.id) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
