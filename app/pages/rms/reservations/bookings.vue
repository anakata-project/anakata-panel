<script setup lang="ts">
import type { Booking, BookingAuditRow, BookingSegment, CreateReservationResponse, Group, Paginated } from '../../../types/api'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import BookingPanel from '../../../components/bookings/BookingPanel.vue'
import GroupDrawer from '../../../components/bookings/GroupDrawer.vue'
import NewReservationModal from '../../../components/bookings/NewReservationModal.vue'
import {
  bookingToOpen,
  segmentPillClass,
  statusLabel,
  statusPillClass
} from '../../../components/bookings/bookingHelpers'

const SEARCH_DEBOUNCE_MS = 300

const SEGMENTS: Array<{ id: 'ALL' | BookingSegment, labelKey: string }> = [
  { id: 'ALL', labelKey: 'bookings.segmentAll' },
  { id: 'D2C', labelKey: 'bookings.segmentD2c' },
  { id: 'B2B', labelKey: 'bookings.segmentB2b' },
  { id: 'CHARTER', labelKey: 'bookings.segmentCharter' }
]

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const route = useRoute()
const router = useRouter()
const { open: newOpen, prefill: newPrefill, openNew } = useNewReservation()

const from = ref<string | null>(null)
const to = ref<string | null>(null)
const segment = ref<'ALL' | BookingSegment>('ALL')
const searchInput = ref('')
const search = ref('')
const mine = ref(false)
const overdueOnly = ref(false)
const page = ref(1)
const auditPage = ref(1)
const today = computed(() => format(new Date(), 'iso'))

const panelOpen = ref(false)
const selected = ref<Booking | null>(null)
const groupOpen = ref(false)
const selectedGroup = ref<Group | null>(null)
const openedFromQuery = ref(false)

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

watch([search, segment, mine, overdueOnly, from, to], () => {
  page.value = 1
  auditPage.value = 1
})

const canViewAudit = computed(() => can('bookings.view_all'))
const canCreate = computed(() => can('bookings.create'))

const listUrl = computed(() => {
  const params = new URLSearchParams({
    page: String(page.value),
    per_page: '50'
  })

  if (from.value !== null) {
    params.set('from', from.value)
  }

  if (to.value !== null) {
    params.set('to', to.value)
  }

  if (segment.value !== 'ALL') {
    params.set('segment', segment.value)
  }

  if (search.value !== '') {
    params.set('q', search.value)
  }

  if (mine.value) {
    params.set('mine', '1')
  }

  if (overdueOnly.value) {
    params.set('overdue', '1')
  }

  return `/api/rms/bookings?${params.toString()}`
})

const groupsUrl = computed(() => {
  const params = new URLSearchParams()

  if (from.value !== null) {
    params.set('from', from.value)
  }

  if (to.value !== null) {
    params.set('to', to.value)
  }

  const query = params.toString()

  return query === '' ? '/api/rms/groups' : `/api/rms/groups?${query}`
})

const auditUrl = computed(() => {
  const params = new URLSearchParams({
    page: String(auditPage.value),
    per_page: '50'
  })

  if (from.value !== null) {
    params.set('from', from.value)
  }

  if (to.value !== null) {
    params.set('to', to.value)
  }

  return `/api/rms/bookings/audit?${params.toString()}`
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
const total = computed(() => listPayload.value?.meta.total ?? 0)
const meta = computed(() => listPayload.value?.meta)
const groups = computed(() => groupsPayload.value?.data ?? [])
const audit = computed(() => auditPayload.value?.data ?? [])
const auditMeta = computed(() => auditPayload.value?.meta)

function openBooking(booking: Booking): void {
  selected.value = booking
  panelOpen.value = true
}

function openGroup(group: Group): void {
  selectedGroup.value = group
  groupOpen.value = true
}

async function openGroupById(id: number): Promise<void> {
  const fromList = groups.value.find(item => item.id === id)

  if (fromList !== undefined) {
    panelOpen.value = false
    openGroup(fromList)
    return
  }

  const all = await request('/api/rms/groups') as { data: Array<Group> }
  const found = all.data.find(item => item.id === id)

  if (found !== undefined) {
    panelOpen.value = false
    openGroup(found)
  }
}

async function refreshAll(): Promise<void> {
  await refresh()
  await refreshGroups()

  if (canViewAudit.value) {
    await refreshAudit()
  }
}

async function onUpdated(booking: Booking): Promise<void> {
  await refreshAll()
  selected.value = bookings.value.find(item => item.id === booking.id) ?? booking
}

async function onDeleted(): Promise<void> {
  selected.value = null
  await refreshAll()
}

async function onCreated(response: CreateReservationResponse): Promise<void> {
  newOpen.value = false
  await refreshAll()
  const first = response.bookings[0]

  if (first === undefined) {
    return
  }

  openBooking(bookings.value.find(item => item.id === first.id) ?? first)
}

function onOpenBookingFromGroup(booking: Booking): void {
  openBooking(booking)
}

watch(
  () => route.query.new,
  (value) => {
    if (value !== '1') {
      return
    }

    const departureRaw = route.query.departure_id
    const cabinRaw = route.query.cabin
    const departureId = typeof departureRaw === 'string' ? Number(departureRaw) : NaN

    openNew({
      departureId: Number.isFinite(departureId) ? departureId : undefined,
      cabinCode: typeof cabinRaw === 'string' ? cabinRaw : undefined
    })

    const query = { ...route.query }
    delete query.new
    delete query.departure_id
    delete query.cabin
    void router.replace({ query })
  },
  { immediate: true }
)

watch(
  [listPayload, () => route.query.open],
  async ([payload, open]) => {
    if (openedFromQuery.value || payload === undefined) {
      return
    }

    const fromList = bookingToOpen(open as string | Array<string> | undefined, payload.data)

    if (fromList !== null) {
      openBooking(fromList)
      openedFromQuery.value = true
      return
    }

    const reference = Array.isArray(open) ? open[0] : open

    if (typeof reference !== 'string' || reference === '') {
      openedFromQuery.value = true
      return
    }

    const found = await request(`/api/rms/bookings?q=${encodeURIComponent(reference)}&per_page=50`) as Paginated<Booking>
    const match = bookingToOpen(reference, found.data)

    if (match !== null) {
      openBooking(match)
    }

    openedFromQuery.value = true
  }
)
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="t('bookings.fieldLabel')"
      :noun="t('bookings.noun')"
      :total="total"
      :today="today"
    />

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
      <p class="note">
        {{ t('bookings.guestsOmitted') }}
      </p>
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
              @click="openBooking(row)"
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
              @click="openGroup(row)"
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

    <BookingPanel
      v-model:open="panelOpen"
      :booking="selected"
      @updated="onUpdated"
      @deleted="onDeleted"
      @open-group="openGroupById"
    />

    <GroupDrawer
      v-model:open="groupOpen"
      :group="selectedGroup"
      @open-booking="onOpenBookingFromGroup"
    />

    <NewReservationModal
      v-model:open="newOpen"
      :prefill="newPrefill"
      @created="onCreated"
    />
  </div>
</template>
