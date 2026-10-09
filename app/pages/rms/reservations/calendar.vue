<script setup lang="ts">
import type { CalendarRow } from '../../../types/api'
import CalendarCell from '../../../components/calendar/CalendarCell.vue'
import CalendarOccupancyHost from '../../../components/calendar/CalendarOccupancyHost.vue'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import { addMonths } from '../../../components/lists/dateRange'
import {
  bookingOwnerId,
  buildCalendarView,
  canActOnBooking,
  cellAt,
  columnDayMonth,
  columnWeekday,
  legendKeysOf,
  mapCabinCell,
  type CellPresentation,
  type DateColumn,
  type LegendKey
} from '../../../components/calendar/calendarHelpers'

const { t } = useI18n()
const { user, can } = useAuth()
const { format } = useDates()
const { count: requestCount, allowed: showRequests } = useOpenRequests()

const todayIso = format(new Date(), 'iso')
const today = computed(() => format(new Date(), 'iso'))
const from = ref<string | null>(todayIso)
const to = ref<string | null>(addMonths(todayIso, 6))
const yachtId = ref<number | null>(null)

const { refresh, columns, sections, departures, total } = useCalendarGrid(from, to)

const yachtChoices = computed(() => {
  const seen = new Map<number, { id: number, name: string }>()

  for (const section of sections.value) {
    if (!seen.has(section.yacht.id)) {
      seen.set(section.yacht.id, { id: section.yacht.id, name: section.yacht.name })
    }
  }

  return [...seen.values()]
})

const visibleSections = computed(() => {
  if (yachtId.value === null) {
    return sections.value
  }

  return sections.value.filter(section => section.yacht.id === yachtId.value)
})

const visibleDepartureCount = computed(() => {
  if (yachtId.value === null) {
    return departures.value.length
  }

  return departures.value.filter(departure => departure.yacht.id === yachtId.value).length
})

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

const calendar = computed(() => buildCalendarView(visibleSections.value, columns.value, present))
const summary = computed(() => calendar.value.summary)

const kpis = computed(() => {
  const items = [
    {
      id: 'departures',
      icon: 'i-lucide-calendar-days',
      label: t('calendar.kpiSuiteDepartures'),
      value: String(summary.value.suiteDepartures),
      sub: t('calendar.kpiSuiteDeparturesSub', {
        yachts: String(visibleSections.value.length),
        departures: String(visibleDepartureCount.value)
      }),
      accent: false
    },
    {
      id: 'sold',
      icon: 'i-lucide-check',
      label: t('calendar.kpiSold'),
      value: String(summary.value.sold),
      sub: t('calendar.kpiSoldSub', { percent: String(summary.value.soldPercent) }),
      accent: false
    },
    {
      id: 'available',
      icon: 'i-lucide-sailboat',
      label: t('calendar.kpiAvailable'),
      value: String(summary.value.available),
      sub: t('calendar.kpiAvailableSub'),
      accent: false
    },
    {
      id: 'hold',
      icon: 'i-lucide-clock',
      label: t('calendar.kpiHold'),
      value: String(summary.value.hold),
      sub: t('calendar.kpiHoldSub'),
      accent: false
    }
  ]

  if (showRequests.value) {
    items.push({
      id: 'requests',
      icon: 'i-lucide-inbox',
      label: t('calendar.kpiRequests'),
      value: String(requestCount.value),
      sub: t('calendar.kpiRequestsSub'),
      accent: requestCount.value > 0
    })
  }

  return items
})

type LegendChip = {
  key: LegendKey
  swatch: string
  label: string
  title: string
}

const chips = computed<Array<LegendChip>>(() => [
  { key: 'available', swatch: 'sw-av', label: t('calendar.legendAvailable'), title: t('calendar.legendAvailable') },
  { key: 'hold', swatch: 'sw-hold', label: t('calendar.legendHold'), title: t('calendar.legendHold') },
  { key: 'confirmed', swatch: 'sw-conf', label: t('calendar.legendConfirmed'), title: t('calendar.legendConfirmed') },
  { key: 'full', swatch: 'sw-full', label: t('calendar.legendFull'), title: t('calendar.legendFull') },
  { key: 'pending', swatch: 'sw-dep', label: t('calendar.legendPending'), title: t('calendar.legendPending') },
  { key: 'requested', swatch: 'sw-req', label: t('calendar.chipRequested'), title: t('calendar.legendRequested') },
  { key: 'charter', swatch: 'sw-charter', label: t('calendar.chipCharter'), title: t('calendar.legendCharter') },
  { key: 'block', swatch: 'sw-block', label: t('calendar.legendBlock'), title: t('calendar.legendBlock') },
  { key: 'locked', swatch: 'sw-lock', label: t('calendar.chipLock'), title: t('calendar.legendLock') }
])

// Legend chips highlight a status: cells outside the chosen set fade back.
const focused = ref<Array<LegendKey>>([])

function toggleChip(key: LegendKey): void {
  focused.value = focused.value.includes(key)
    ? focused.value.filter(item => item !== key)
    : [...focused.value, key]
}

function isDim(cell: CellPresentation): boolean {
  if (focused.value.length === 0) {
    return false
  }

  return !legendKeysOf(cell).some(key => focused.value.includes(key))
}

function isFull(occupancy: { sold: number, total: number }): boolean {
  return occupancy.total > 0 && occupancy.sold === occupancy.total
}

function occupancyWidth(occupancy: { sold: number, total: number }): string {
  return occupancy.total === 0 ? '0%' : `${String(Math.round(occupancy.sold * 100 / occupancy.total))}%`
}
</script>

<template>
  <CalendarOccupancyHost :refresh="refresh">
    <template #default="{ openBooking, offerFree }">
      <div class="cal">
        <div class="cal-kpis">
          <AnkKpi
            v-for="kpi in kpis"
            :key="kpi.id"
            :icon="kpi.icon"
            :label="kpi.label"
            :sub="kpi.sub"
            :class="{ 'cal-kpi--accent': kpi.accent }"
          >
            {{ kpi.value }}
          </AnkKpi>
        </div>

        <DateRangeFilter
          v-model:from="from"
          v-model:to="to"
          v-model:yacht="yachtId"
          :yachts="yachtChoices"
          :field-label="t('calendar.fieldLabel')"
          :noun="t('calendar.noun')"
          :total="total"
          :today="today"
        />

        <div
          class="cal-legend"
          role="group"
          :aria-label="t('calendar.filterAria')"
        >
          <button
            v-for="chip in chips"
            :key="chip.key"
            type="button"
            class="cal-chip"
            :class="{ on: focused.includes(chip.key) }"
            :aria-pressed="focused.includes(chip.key)"
            :title="chip.title"
            @click="toggleChip(chip.key)"
          >
            <i
              class="sw"
              :class="chip.swatch"
            />
            <span>{{ chip.label }}</span>
            <b>{{ summary.legend[chip.key] }}</b>
          </button>
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
                  <span class="cal-dow">{{ columnWeekday(column.date) }}</span>
                  <span class="cal-day">{{ columnDayMonth(column.date) }}</span>
                  <span
                    v-if="column.festive"
                    class="cal-fest"
                  >{{ t('calendar.festive') }}</span>
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
                v-for="section in calendar.sections"
                :key="section.yacht.id"
              >
                <tr class="yachthdr">
                  <td class="rowh">
                    <span class="yh-name">
                      <UIcon
                        name="i-lucide-sailboat"
                        class="yh-icon"
                      />
                      {{ section.yacht.name }}
                    </span>
                    <span class="yh-sold">{{ t('calendar.yachtSold', { percent: String(section.soldPercent) }) }}</span>
                  </td>
                  <td
                    v-for="(occupancy, index) in section.occupancy"
                    :key="`occ-${section.yacht.id}-${String(index)}`"
                  >
                    <span
                      class="occ"
                      :title="t('calendar.occupancy', { sold: String(occupancy.sold), total: String(occupancy.total) })"
                    >
                      <span class="occ-n">{{ occupancy.sold }}/{{ occupancy.total }}</span>
                      <span class="occ-track">
                        <i
                          class="occ-fill"
                          :class="{ full: isFull(occupancy) }"
                          :style="{ width: occupancyWidth(occupancy) }"
                        />
                      </span>
                    </span>
                  </td>
                </tr>
                <tr
                  v-for="item in section.rows"
                  :key="`${section.yacht.id}-${item.row.cabin.id}`"
                >
                  <td
                    class="rowh"
                    :class="{ owner: item.row.cabin.category === 'OWNER' }"
                  >
                    <span class="cab">{{ item.row.cabin.label }}</span>
                    <span class="cab-open">{{ t('calendar.rowOpen', { count: String(item.open) }) }}</span>
                  </td>
                  <td
                    v-for="(cell, index) in item.cells"
                    :key="`${item.row.cabin.id}-${columns[index]?.date ?? index}`"
                  >
                    <CalendarCell
                      :view="cell"
                      :dim="isDim(cell)"
                      @activate="onActivate(cell, openBooking, offerFree)"
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </CalendarOccupancyHost>
</template>
