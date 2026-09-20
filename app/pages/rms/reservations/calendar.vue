<script setup lang="ts">
import type { CalendarGrid, CalendarRow } from '../../../types/api'
import CalendarCell from '../../../components/calendar/CalendarCell.vue'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import { addMonths } from '../../../components/lists/dateRange'
import {
  cellAt,
  groupColumnsByDate,
  mapCabinCell,
  yachtSections,
  type DateColumn
} from '../../../components/calendar/calendarHelpers'

const { t } = useI18n()
const { useFetch } = useApi()
const { format } = useDates()

const todayIso = format(new Date(), 'iso')
const today = computed(() => format(new Date(), 'iso'))
const from = ref<string | null>(todayIso)
const to = ref<string | null>(addMonths(todayIso, 6))

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
const columns = computed(() => groupColumnsByDate(departures.value))
const sections = computed(() => yachtSections(grid.value?.rows ?? []))
const total = computed(() => departures.value.length)

function present(row: CalendarRow, column: DateColumn) {
  const cell = cellAt(row, column)

  return mapCabinCell({
    state: cell?.state ?? null,
    claim: cell?.claim ?? null,
    cabinLabel: row.cabin.label,
    dateLabel: format(column.date, 'short'),
    yachtName: row.yacht.name
  })
}
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="t('calendar.fieldLabel')"
      :noun="t('calendar.noun')"
      :total="total"
      :today="today"
    />

    <div class="legend">
      <span>
        <i class="sw sw-av" />
        {{ t('calendar.legendAvailable') }}
      </span>
      <span>
        <i class="sw sw-hold" />
        {{ t('calendar.legendHold') }}
      </span>
      <span>
        <i class="sw sw-conf" />
        {{ t('calendar.legendConfirmed') }}
      </span>
      <span>
        <i class="sw sw-full" />
        {{ t('calendar.legendFull') }}
      </span>
      <span>
        <i class="sw sw-dep" />
        {{ t('calendar.legendPending') }}
      </span>
      <span>
        <i class="sw sw-req" />
        {{ t('calendar.legendRequested') }}
      </span>
      <span>
        <i class="sw sw-charter" />
        {{ t('calendar.legendCharter') }}
      </span>
      <span>
        <i class="sw sw-block" />
        {{ t('calendar.legendBlock') }}
      </span>
      <span>{{ t('calendar.legendLock') }}</span>
    </div>

    <div class="tl">
      <table class="grid">
        <thead>
          <tr>
            <th class="rowh">
              {{ t('calendar.colCabin') }}
            </th>
            <th
              v-for="column in columns"
              :key="column.date"
              :class="{ xmas: column.festive }"
            >
              {{ format(column.date, 'short') }}
              <template v-if="column.festive">
                <br>{{ t('calendar.festive') }}
              </template>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="columns.length === 0">
            <td class="dr-none">
              {{ t('calendar.empty') }}
            </td>
          </tr>
          <template
            v-for="section in sections"
            :key="section.yacht.id"
          >
            <tr class="yachthdr">
              <td :colspan="columns.length + 1">
                {{ t('calendar.yachtHeader', { name: section.yacht.name }) }}
              </td>
            </tr>
            <tr
              v-for="row in section.rows"
              :key="`${section.yacht.id}-${row.cabin.id}`"
            >
              <td class="rowh">
                {{ row.cabin.label }}
              </td>
              <td
                v-for="column in columns"
                :key="`${row.cabin.id}-${column.date}`"
              >
                <CalendarCell :view="present(row, column)" />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <p class="notice cal-notice">
      {{ t('calendar.notice') }}
    </p>
  </div>
</template>
