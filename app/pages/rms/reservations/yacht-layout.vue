<script setup lang="ts">
import type { CalendarRow } from '../../../types/api'
import CalendarOccupancyHost from '../../../components/calendar/CalendarOccupancyHost.vue'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import { addMonths } from '../../../components/lists/dateRange'
import {
  bookingOwnerId,
  canActOnBooking,
  cellAt,
  deckCabinName,
  deckCabinOrder,
  departureDateOptions,
  departureSelectItems,
  mapCabinCell,
  retainSelectedDate,
  type CellPresentation
} from '../../../components/calendar/calendarHelpers'

const { t } = useI18n()
const { user, can } = useAuth()
const { format } = useDates()

const todayIso = format(new Date(), 'iso')
const today = computed(() => format(new Date(), 'iso'))
const from = ref<string | null>(todayIso)
const to = ref<string | null>(addMonths(todayIso, 6))
const selectedDate = ref<string | null>(null)

const { refresh, departures, columns, sections, total } = useCalendarGrid(from, to)

const canCreate = computed(() => can('bookings.create'))
const hasActOnAny = computed(() => can('records.act_on_any'))

const options = computed(() => departureDateOptions(departures.value))

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

const departureItems = computed(() => departureSelectItems(
  options.value,
  option => optionLabel(option.date, option.festive)
))

function onSelectedDate(value: string | number | null | undefined): void {
  selectedDate.value = value === '' || value === null || value === undefined ? null : String(value)
}

function cabinPresentation(row: CalendarRow): CellPresentation {
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

function sailing(sectionYachtId: number): boolean {
  return selectedColumn.value?.departuresByYachtId[sectionYachtId] !== undefined
}

function ordered(rows: Array<CalendarRow>): Array<CalendarRow> {
  return deckCabinOrder(rows)
}

function cabinClasses(row: CalendarRow): Array<string> {
  const view = cabinPresentation(row)

  return [
    row.cabin.code === 'OWNER' ? 'owner' : '',
    view.deckClass,
    view.action.type === 'open' || view.action.type === 'free' || view.action.type === 'block' ? 'is-click' : ''
  ]
}

function cabinStatus(row: CalendarRow, yachtId: number): string {
  if (!sailing(yachtId)) {
    return ''
  }

  return cabinPresentation(row).deckStatus
}

function onCabinClick(
  row: CalendarRow,
  yachtId: number,
  openBooking: (id: number) => Promise<void>,
  offerFree: (departureId: number, cabinCode: string) => void
): void {
  if (!sailing(yachtId)) {
    return
  }

  const view = cabinPresentation(row)

  if (view.action.type === 'open') {
    void openBooking(view.action.bookingId)
    return
  }

  if (view.action.type === 'free') {
    offerFree(view.action.departureId, view.action.cabinCode)
    return
  }

  if (view.action.type === 'block' && view.href !== null) {
    void navigateTo(view.href)
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
          :field-label="t('yachtLayout.fieldLabel')"
          :noun="t('yachtLayout.noun')"
          :total="total"
          :today="today"
        />

        <div class="field yl-select">
          <label for="ylsel">{{ t('yachtLayout.departure') }}</label>
          <USelect
            id="ylsel"
            :model-value="selectedDate ?? undefined"
            :items="departureItems"
            :disabled="options.length === 0"
            :placeholder="t('yachtLayout.empty')"
            class="w-full"
            @update:model-value="onSelectedDate"
          />
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
                :title="sailing(section.yacht.id) ? cabinPresentation(row).title : undefined"
                @click="onCabinClick(row, section.yacht.id, openBooking, offerFree)"
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
  </CalendarOccupancyHost>
</template>
