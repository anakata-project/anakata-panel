<script setup lang="ts">
import type { Booking, CreateReservationResponse, Group } from '../../types/api'
import BookingPanel from '../bookings/BookingPanel.vue'
import GroupDrawer from '../bookings/GroupDrawer.vue'
import NewReservationModal from '../bookings/NewReservationModal.vue'

const props = defineProps<{
  refresh: () => Promise<void>
}>()

const { request } = useApi()
const { open: newOpen, prefill: newPrefill, openNew } = useNewReservation()

const panelOpen = ref(false)
const selected = ref<Booking | null>(null)
const groupOpen = ref(false)
const selectedGroup = ref<Group | null>(null)

async function openBooking(id: number): Promise<void> {
  selected.value = await request(`/api/rms/bookings/${String(id)}`) as Booking
  panelOpen.value = true
}

function openBookingRecord(booking: Booking): void {
  selected.value = booking
  panelOpen.value = true
}

function offerFree(departureId: number, cabinCode: string): void {
  openNew({ departureId, cabinCode })
}

async function onUpdated(booking: Booking): Promise<void> {
  await props.refresh()
  selected.value = booking
}

async function onDeleted(): Promise<void> {
  selected.value = null
  await props.refresh()
}

async function onCreated(response: CreateReservationResponse): Promise<void> {
  await props.refresh()
  const first = response.bookings[0]

  if (first !== undefined) {
    openBookingRecord(first)
  }
}

async function openGroupById(id: number): Promise<void> {
  const all = await request('/api/rms/groups') as { data: Array<Group> }
  const found = all.data.find(item => item.id === id)

  if (found !== undefined) {
    panelOpen.value = false
    selectedGroup.value = found
    groupOpen.value = true
  }
}

function onOpenBookingFromGroup(booking: Booking): void {
  openBookingRecord(booking)
}

defineExpose({ openBooking, offerFree })
</script>

<template>
  <slot
    :open-booking="openBooking"
    :offer-free="offerFree"
  />

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
</template>
