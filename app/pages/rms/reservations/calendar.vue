<script setup lang="ts">
import type { CalendarRow } from '../../../types/api'
import CalendarCell from '../../../components/calendar/CalendarCell.vue'
import CalendarOccupancyHost from '../../../components/calendar/CalendarOccupancyHost.vue'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import { addMonths } from '../../../components/lists/dateRange'
import {
  bookingOwnerId,
  canActOnBooking,
  cellAt,
  mapCabinCell,
  type CellPresentation,
  type DateColumn
} from '../../../components/calendar/calendarHelpers'

const { t } = useI18n()
const { user, can } = useAuth()
const { format } = useDates()

const todayIso = format(new Date(), 'iso')
const today = computed(() => format(new Date(), 'iso'))
const from = ref<string | null>(todayIso)
const to = ref<string | null>(addMonths(todayIso, 6))

const { refresh, columns, sections, total } = useCalendarGrid(from, to)

const canCreate = computed(() => can('bookings.create'))
const hasActOnAny = computed(() => can('records.act_on_any'))

function present(row: CalendarRow, column: DateColumn): CellPresentation {
  const cell = cellAt(row, column, columns.value)
  const departure = column.departuresByYachtId[row.yacht.id]
  const claim = cell?.claim ?? null
  const ownerId = bookingOwnerId(claim)
  const canAct = ownerId === null
    ? null
    : canActOnBooking(ownerId, user.value?.id ?? null, hasActOnAny.value)

  return mapCabinCell({
    state: cell?.state ?? null,
    claim,
    cabinLabel: row.cabin.label,
    dateLabel: format(column.date, 'short'),
    yachtName: row.yacht.name,
    canAct,
    canCreate: canCreate.value,
    departureId: departure?.id ?? null,
    cabinCode: row.cabin.code
  })
}

function onActivate(
  view: CellPresentation,
  openBooking: (id: number) => Promise<void>,
  offerFree: (departureId: number, cabinCode: string) => void
): void {
  if (view.action.type === 'open') {
    void openBooking(view.action.bookingId)
    return
  }

  if (view.action.type === 'free') {
    offerFree(view.action.departureId, view.action.cabinCode)
  }
}
</script>

<template>
  <CalendarOccupancyHost :refresh="refresh">
    <template #default="{ openBooking, offerFree }">
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
                    <CalendarCell
                      :view="present(row, column)"
                      @activate="onActivate(present(row, column), openBooking, offerFree)"
                    />
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
  </CalendarOccupancyHost>
</template>
