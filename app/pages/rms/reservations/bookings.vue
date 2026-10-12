<script setup lang="ts">
import type { Booking, CreateReservationResponse, Group, Paginated } from '../../../types/api'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import BookingPanel from '../../../components/bookings/BookingPanel.vue'
import GroupDrawer from '../../../components/bookings/GroupDrawer.vue'
import NewReservationModal from '../../../components/bookings/NewReservationModal.vue'
import AllBookingsView from '../../../components/bookings/views/AllBookingsView.vue'
import RequestsView from '../../../components/bookings/views/RequestsView.vue'
import ContactsInView from '../../../components/bookings/views/ContactsInView.vue'
import { bookingToOpen } from '../../../components/bookings/bookingHelpers'
import { viewFromQuery, type BookingViewId } from '../../../components/bookings/bookingViews'

const VIEW_LABELS: Record<BookingViewId, string> = {
  'all': 'bookings.viewAll',
  'requests': 'bookings.viewRequests',
  'contacts-in': 'bookings.viewContacts'
}

const { can } = useAuth()
const { t } = useI18n()
const { request } = useApi()
const route = useRoute()
const router = useRouter()
const { open: newOpen, prefill: newPrefill, openNew } = useNewReservation()
const { from, to, today, total, bump, businessDayMinutes } = useBookingListWindow()

const panelOpen = ref(false)
const selected = ref<Booking | null>(null)
const groupOpen = ref(false)
const selectedGroup = ref<Group | null>(null)
const openedFromQuery = ref(false)

const allowedViews = computed(() => {
  const views: Array<BookingViewId> = ['all']

  if (can('requests.confirm') || can('requests.release')) {
    views.push('requests')
  }

  if (can('panel.rms')) {
    views.push('contacts-in')
  }

  return views
})

const view = computed(() => viewFromQuery(route.query.view, allowedViews.value, 'all'))

const fieldLabel = computed(() => {
  if (view.value === 'requests') {
    return t('requests.fieldLabel')
  }

  if (view.value === 'contacts-in') {
    return t('contactsIn.fieldLabel')
  }

  return t('bookings.fieldLabel')
})

const noun = computed(() => {
  if (view.value === 'requests') {
    return t('requests.noun')
  }

  if (view.value === 'contacts-in') {
    return t('contactsIn.noun')
  }

  return t('bookings.noun')
})

function selectView(id: BookingViewId): void {
  void router.replace({ query: { ...route.query, view: id } })
}

watch(allowedViews, () => {
  const raw = Array.isArray(route.query.view) ? route.query.view[0] : route.query.view

  if (raw === view.value) {
    return
  }

  void router.replace({ query: { ...route.query, view: view.value } })
}, { immediate: true })

function openBooking(booking: Booking): void {
  selected.value = booking
  panelOpen.value = true
}

function openGroup(group: Group): void {
  selectedGroup.value = group
  groupOpen.value = true
}

async function openGroupById(id: number): Promise<void> {
  const all = await request('/api/rms/groups') as { data: Array<Group> }
  const found = all.data.find(item => item.id === id)

  if (found !== undefined) {
    panelOpen.value = false
    openGroup(found)
  }
}

async function onUpdated(booking: Booking): Promise<void> {
  selected.value = booking
  bump()
}

async function onDeleted(): Promise<void> {
  selected.value = null
  bump()
}

async function onCreated(response: CreateReservationResponse): Promise<void> {
  newOpen.value = false
  bump()

  if (view.value !== 'all') {
    selectView('all')
  }

  const first = response.bookings[0]

  if (first !== undefined) {
    openBooking(first)
  }
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
  () => route.query.open,
  async (open) => {
    if (openedFromQuery.value) {
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
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="fieldLabel"
      :noun="noun"
      :total="total"
      :today="today"
    />

    <div
      class="fchips"
      role="group"
      :aria-label="t('bookings.viewsAria')"
    >
      <button
        v-for="id in allowedViews"
        :key="id"
        type="button"
        class="fchip"
        :class="{ on: view === id }"
        :aria-pressed="view === id"
        @click="selectView(id)"
      >
        {{ t(VIEW_LABELS[id]) }}
      </button>
    </div>

    <AllBookingsView
      v-if="view === 'all'"
      @open="openBooking"
      @open-group="openGroup"
    />
    <RequestsView
      v-else-if="view === 'requests'"
      @open="openBooking"
    />
    <ContactsInView
      v-else
      @open="openBooking"
    />

    <BookingPanel
      v-model:open="panelOpen"
      :booking="selected"
      :business-day-minutes="businessDayMinutes"
      @updated="onUpdated"
      @deleted="onDeleted"
      @open-group="openGroupById"
    />

    <GroupDrawer
      v-model:open="groupOpen"
      :group="selectedGroup"
      @open-booking="openBooking"
    />

    <NewReservationModal
      v-model:open="newOpen"
      :prefill="newPrefill"
      @created="onCreated"
    />
  </div>
</template>
