<script setup lang="ts">
import type { Booking, Paginated, PaymentOption } from '../../types/api'
import { bookingToOpen, displayReferenceMatch } from '../bookings/bookingHelpers'
import { recordableOptions } from './paymentHelpers'

const SEARCH_DEBOUNCE_MS = 300

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  stripeId: string
  kinds: Array<PaymentOption>
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [payload: { bookingId: number, kind: string }]
}>()

const { t } = useI18n()
const { request } = useApi()

const query = ref('')
const matches = ref<Array<Booking>>([])
const selected = ref<Booking | null>(null)
const kind = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined

const kindChoices = computed(() => recordableOptions(props.kinds))

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  query.value = ''
  matches.value = []
  selected.value = null
  kind.value = kindChoices.value.find(item => item.value === 'DEPOSIT')?.value
    ?? kindChoices.value[0]?.value
    ?? ''
})

async function searchBookings(value: string): Promise<void> {
  const q = value.trim()

  if (q === '') {
    matches.value = []
    return
  }

  const result = await request(`/api/rms/bookings?q=${encodeURIComponent(q)}&per_page=50`) as Paginated<Booking>
  matches.value = result.data
}

function onQuery(value: string): void {
  query.value = value

  if (selected.value !== null && !displayReferenceMatch(value, selected.value.display_reference)) {
    selected.value = null
  }

  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    void searchBookings(value)
  }, SEARCH_DEBOUNCE_MS)
}

function pickBooking(booking: Booking): void {
  selected.value = booking
  query.value = booking.display_reference ?? booking.reference ?? ''
  matches.value = []
}

function submit(): void {
  const booking = selected.value ?? bookingToOpen(query.value, matches.value)

  if (booking === null || kind.value === '') {
    return
  }

  emit('submit', { bookingId: booking.id, kind: kind.value })
}

onUnmounted(() => {
  clearTimeout(searchTimer)
})
</script>

<template>
  <UModal
    :open="open"
    :title="t('payments.applyTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <p class="field-hint">
          {{ t('payments.applyStripe', { id: stripeId }) }}
        </p>
        <div class="field">
          <label for="apply-booking">{{ t('payments.applyBooking') }}</label>
          <input
            id="apply-booking"
            :value="query"
            type="text"
            autocomplete="off"
            @input="onQuery(($event.target as HTMLInputElement).value)"
          >
          <div
            v-if="matches.length > 0 && selected === null"
            class="nb-suggest"
          >
            <button
              v-for="booking in matches"
              :key="booking.id"
              type="button"
              class="nb-suggest-item"
              @click="pickBooking(booking)"
            >
              {{ booking.display_reference }} · {{ booking.contact.name }}
            </button>
          </div>
        </div>
        <div class="field">
          <label for="apply-kind">{{ t('payments.kind') }}</label>
          <select
            id="apply-kind"
            v-model="kind"
          >
            <option
              v-for="option in kindChoices"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </div>
        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting || kind === '' || (selected === null && query.trim() === '')"
          >
            {{ t('payments.applySubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
