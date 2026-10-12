<script setup lang="ts">
import type { Booking, BookingAuditRow, BookingSegment, Group, Paginated } from '../../../types/api'
import {
  segmentPillClass,
  statusLabel,
  statusPillClass
} from '../bookingHelpers'

const SEARCH_DEBOUNCE_MS = 300

const SEGMENTS: Array<{ id: 'ALL' | BookingSegment, labelKey: string }> = [
  { id: 'ALL', labelKey: 'bookings.segmentAll' },
  { id: 'D2C', labelKey: 'bookings.segmentD2c' },
  { id: 'B2B', labelKey: 'bookings.segmentB2b' },
  { id: 'CHARTER', labelKey: 'bookings.segmentCharter' }
]

const emit = defineEmits<{
  open: [booking: Booking]
  openGroup: [group: Group]
}>()

const { can } = useAuth()
const { t } = useI18n()
const { useFetch } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const { openNew } = useNewReservation()
const { revision, params, setTotal, onWindowChange } = useBookingListWindow()

const segment = ref<'ALL' | BookingSegment>('ALL')
const searchInput = ref('')
const search = ref('')
const mine = ref(false)
const overdueOnly = ref(false)
const page = ref(1)
const auditPage = ref(1)

let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
  }, SEARCH_DEBOUNCE_MS)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})

watch([search, segment, mine, overdueOnly], () => {
  page.value = 1
  auditPage.value = 1
})

onWindowChange(() => {
  page.value = 1
  auditPage.value = 1
})

const canViewAudit = computed(() => can('bookings.view_all'))
const canCreate = computed(() => can('bookings.create'))

const listUrl = computed(() => {
  const query = params()
  query.set('page', String(page.value))
  query.set('per_page', '50')

  if (segment.value !== 'ALL') {
    query.set('segment', segment.value)
  }

  if (search.value !== '') {
    query.set('q', search.value)
  }

  if (mine.value) {
    query.set('mine', '1')
  }

  if (overdueOnly.value) {
    query.set('overdue', '1')
  }

  return `/api/rms/bookings?${query.toString()}`
})

const groupsUrl = computed(() => {
  const query = params().toString()

  return query === '' ? '/api/rms/groups' : `/api/rms/groups?${query}`
})

const auditUrl = computed(() => {
  const query = params()
  query.set('page', String(auditPage.value))
  query.set('per_page', '50')

  return `/api/rms/bookings/audit?${query.toString()}`
})

const { data: listPayload, refresh } = useFetch<Paginated<Booking>>(listUrl)
const { data: groupsPayload, refresh: refreshGroups } = useFetch<{ data: Array<Group> }>(groupsUrl)
const { data: auditPayload, refresh: refreshAudit } = useFetch<Paginated<BookingAuditRow>>(auditUrl, {
  immediate: false
})

watch([canViewAudit, auditUrl], ([allowed]) => {
  if (allowed) {
    void refreshAudit()
  }
}, { immediate: true })

const bookings = computed(() => listPayload.value?.data ?? [])
const listTotal = computed(() => listPayload.value?.meta.total ?? 0)
const meta = computed(() => listPayload.value?.meta)
const groups = computed(() => groupsPayload.value?.data ?? [])
const audit = computed(() => auditPayload.value?.data ?? [])
const auditMeta = computed(() => auditPayload.value?.meta)

watch(listTotal, (value) => {
  setTotal(value)
}, { immediate: true })

async function refreshAll(): Promise<void> {
  await refresh()
  await refreshGroups()

  if (canViewAudit.value) {
    await refreshAudit()
  }
}

watch(revision, () => {
  void refreshAll()
})
</script>

<template>
  <div>
    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('bookings.panelTitle') }}</h3>
        <UButton
          v-if="canCreate"
          @click="openNew()"
        >
          {{ t('bookings.newReservation') }}
        </UButton>
      </div>
      <div class="ebtool dep-toolbar">
        <div class="fchips">
          <button
            v-for="item in SEGMENTS"
            :key="item.id"
            type="button"
            class="fchip"
            :class="{ on: segment === item.id }"
            @click="segment = item.id"
          >
            {{ t(item.labelKey) }}
          </button>
        </div>
        <div class="list-filters">
          <UInput
            v-model="searchInput"
            class="bk-search"
            :placeholder="t('bookings.searchPlaceholder')"
            :aria-label="t('bookings.search')"
          />
          <button
            type="button"
            class="fchip bk-mine"
            :class="{ on: mine }"
            @click="mine = !mine"
          >
            {{ t('bookings.mine') }}
          </button>
          <button
            type="button"
            class="fchip bk-mine"
            :class="{ on: overdueOnly }"
            @click="overdueOnly = !overdueOnly"
          >
            {{ t('bookings.overdueOnly') }}
          </button>
        </div>
      </div>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('bookings.colId') }}</th>
              <th>{{ t('bookings.colClient') }}</th>
              <th>{{ t('bookings.colType') }}</th>
              <th>{{ t('bookings.colDeparture') }}</th>
              <th>{{ t('bookings.colCabin') }}</th>
              <th>{{ t('bookings.colTotal') }}</th>
              <th>{{ t('bookings.colBalance') }}</th>
              <th>{{ t('bookings.colStatus') }}</th>
              <th>{{ t('bookings.colOwner') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="bookings.length === 0"
              class="dr-empty"
            >
              <td colspan="9">
                {{ t('bookings.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in bookings"
              :key="row.id"
              class="bk-row"
              @click="emit('open', row)"
            >
              <td class="bk-ref">
                {{ row.display_reference }}
              </td>
              <td>
                {{ row.contact.name }}
                <div
                  v-if="row.group"
                  class="bk-sub"
                >
                  {{ t('bookings.groupLine', { reference: row.group.reference, name: row.group.coordinator.name }) }}
                </div>
                <div
                  class="bk-sub guests-line"
                  :class="row.guests_summary.complete === row.guests_summary.total ? 'guests-ok' : 'guests-muted'"
                >
                  {{ t('bookings.guestsLine', {
                    complete: String(row.guests_summary.complete),
                    total: String(row.guests_summary.total)
                  }) }}
                </div>
              </td>
              <td>
                <span
                  class="sg"
                  :class="segmentPillClass(row.segment)"
                >{{ row.segment }}</span>
                {{ row.channel_of_origin }}
                <div class="bk-sub">
                  {{ row.main_channel }}
                </div>
              </td>
              <td>{{ format(row.departure.date, 'short') }}</td>
              <td>{{ row.cabin_label }}</td>
              <td>{{ money(row.total) }}</td>
              <td>{{ money(row.balance) }}</td>
              <td>
                <span
                  class="pill"
                  :class="statusPillClass(row.status)"
                >{{ statusLabel(row.status) }}</span>
                <span
                  v-if="row.overdue"
                  class="pill p-over"
                >{{ t('bookings.overduePill') }}</span>
              </td>
              <td>
                {{ row.owner.name }}{{ row.can_act ? '' : ` ${t('bookings.ownedLock')}` }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="meta && meta.last_page > 1"
        class="list-pager"
      >
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          @click="page -= 1"
        >
          {{ t('bookings.previous') }}
        </button>
        <span>{{ t('bookings.pager', { from: String(meta.from ?? 0), to: String(meta.to ?? 0), total: String(meta.total) }) }}</span>
        <button
          type="button"
          :disabled="meta.current_page >= meta.last_page"
          @click="page += 1"
        >
          {{ t('bookings.next') }}
        </button>
      </div>
    </div>

    <div class="panel">
      <h3>{{ t('bookings.groupsTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('bookings.colGroup') }}</th>
              <th>{{ t('bookings.colCoordinator') }}</th>
              <th>{{ t('bookings.colDeparture') }}</th>
              <th>{{ t('bookings.colCabins') }}</th>
              <th>{{ t('bookings.colTotal') }}</th>
              <th>{{ t('bookings.colBalance') }}</th>
              <th>{{ t('bookings.colStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="groups.length === 0"
              class="dr-empty"
            >
              <td colspan="7">
                {{ t('bookings.groupsEmpty') }}
              </td>
            </tr>
            <tr
              v-for="row in groups"
              :key="row.id"
              class="bk-row"
              @click="emit('openGroup', row)"
            >
              <td class="bk-ref">
                {{ row.reference }}
              </td>
              <td>
                {{ row.name }}
                <div class="gmeta">
                  {{ t('bookings.groupCoordinator', { name: row.coordinator.name }) }}
                </div>
              </td>
              <td>{{ format(row.departure.date, 'short') }}</td>
              <td>
                {{ row.cabins.length === 1
                  ? t('bookings.groupCabinsOne', { guests: String(row.guests) })
                  : t('bookings.groupCabins', { cabins: String(row.cabins.length), guests: String(row.guests) }) }}
              </td>
              <td>{{ money(row.total) }}</td>
              <td>{{ money(row.balance) }}</td>
              <td>
                <span
                  v-for="status in row.statuses"
                  :key="status"
                  class="pill"
                  :class="statusPillClass(status)"
                >{{ statusLabel(status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      v-if="canViewAudit"
      class="panel"
    >
      <h3>{{ t('bookings.auditTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('bookings.colWhen') }}</th>
              <th>{{ t('bookings.colWho') }}</th>
              <th>{{ t('bookings.colBooking') }}</th>
              <th>{{ t('bookings.colAction') }}</th>
              <th>{{ t('bookings.colReason') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="audit.length === 0"
              class="dr-empty"
            >
              <td colspan="5">
                {{ t('bookings.auditEmpty') }}
              </td>
            </tr>
            <tr
              v-for="(row, index) in audit"
              :key="`${row.at}-${index}`"
            >
              <td class="bk-sub">
                {{ format(row.at, 'dateTime') }}
              </td>
              <td>{{ row.actor_label }}</td>
              <td>
                <span class="bk-ref">{{ row.reference }}</span>
                <div
                  v-if="row.client"
                  class="gmeta"
                >
                  {{ row.client }}
                </div>
              </td>
              <td>{{ row.what }}</td>
              <td class="bk-sub">
                {{ row.why ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="auditMeta && auditMeta.last_page > 1"
        class="list-pager"
      >
        <button
          type="button"
          :disabled="auditMeta.current_page <= 1"
          @click="auditPage -= 1"
        >
          {{ t('bookings.previous') }}
        </button>
        <span>{{ t('bookings.pager', { from: String(auditMeta.from ?? 0), to: String(auditMeta.to ?? 0), total: String(auditMeta.total) }) }}</span>
        <button
          type="button"
          :disabled="auditMeta.current_page >= auditMeta.last_page"
          @click="auditPage += 1"
        >
          {{ t('bookings.next') }}
        </button>
      </div>
    </div>
  </div>
</template>
