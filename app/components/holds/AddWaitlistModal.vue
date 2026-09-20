<script setup lang="ts">
import type {
  BookingFormOptions,
  CabinCategory,
  Contact,
  Departure,
  Paginated,
  PreferredChannel,
  WaitlistEntry
} from '../../types/api'
import { firstApiMessage, applyApiFormError } from '../../utils/apiForm'
import { existingContactSelected } from '../bookings/newReservationHelpers'
import { departureOptionLabel, galapagosTomorrowIso } from '../bookings/bookingHelpers'

const CONTACT_DEBOUNCE_MS = 300

const open = defineModel<boolean>('open', { required: true })

const emit = defineEmits<{
  created: [entry: WaitlistEntry]
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const toast = useToast()

const options = ref<BookingFormOptions | null>(null)
const departures = ref<Array<Departure>>([])
const contacts = ref<Array<Contact>>([])
const selectedContact = ref<Contact | null>(null)
const loading = ref(false)
const submitting = ref(false)
const warn = ref('')
const fieldErrors = ref<Record<string, string>>({})

const departureId = ref<number | null>(null)
const cabinCategory = ref<CabinCategory>('SUITE')
const guestName = ref('')
const email = ref('')
const phone = ref('')
const preferred = ref<PreferredChannel>('EMAIL')
const adults = ref(2)
const children = ref(0)
const notes = ref('')

let contactTimer: ReturnType<typeof setTimeout> | undefined

const existingNotice = computed(() => {
  return selectedContact.value !== null && existingContactSelected(email.value, selectedContact.value.email)
})

const orderedDepartures = computed(() => {
  return [...departures.value].sort((left, right) => {
    const leftFull = left.availability.counts.free === 0 ? 0 : 1
    const rightFull = right.availability.counts.free === 0 ? 0 : 1

    if (leftFull !== rightFull) {
      return leftFull - rightFull
    }

    return left.date.localeCompare(right.date)
  })
})

function reset(): void {
  departureId.value = null
  cabinCategory.value = 'SUITE'
  guestName.value = ''
  email.value = ''
  phone.value = ''
  preferred.value = 'EMAIL'
  adults.value = 2
  children.value = 0
  notes.value = ''
  selectedContact.value = null
  contacts.value = []
  warn.value = ''
  fieldErrors.value = {}
}

async function loadOptions(): Promise<void> {
  options.value = await request('/api/rms/bookings/form-options') as BookingFormOptions
}

async function loadDepartures(): Promise<void> {
  const from = galapagosTomorrowIso(new Date(), (value, style, formatOptions) => format(value, style, formatOptions))
  const collected: Array<Departure> = []
  let page = 1
  let last = 1

  do {
    const result = await request(
      `/api/rms/departures?from=${from}&with_cabins=1&per_page=100&page=${String(page)}`
    ) as Paginated<Departure>
    collected.push(...result.data)
    last = result.meta.last_page
    page += 1
  } while (page <= last)

  departures.value = collected
}

async function searchContacts(query: string): Promise<void> {
  const q = query.trim()

  if (q === '') {
    contacts.value = []
    return
  }

  const result = await request(`/api/rms/contacts?q=${encodeURIComponent(q)}`) as { data: Array<Contact> }
  contacts.value = result.data
}

function onEmailInput(value: string): void {
  email.value = value

  if (selectedContact.value !== null && !existingContactSelected(value, selectedContact.value.email)) {
    selectedContact.value = null
  }

  clearTimeout(contactTimer)
  contactTimer = setTimeout(() => {
    void searchContacts(value)
  }, CONTACT_DEBOUNCE_MS)
}

function pickContact(contact: Contact): void {
  selectedContact.value = contact
  guestName.value = contact.name
  email.value = contact.email ?? ''
  phone.value = contact.phone ?? ''
  preferred.value = contact.preferred_channel as PreferredChannel
  contacts.value = []
}

function departureLabel(row: Departure): string {
  const full = row.availability.counts.free === 0 ? t('holds.fullSuffix') : ''

  return `${departureOptionLabel(
    row.date,
    row.yacht.name,
    row.itinerary.name,
    row.festive,
    iso => format(iso, 'short')
  )}${full}`
}

async function onSubmit(): Promise<void> {
  if (departureId.value === null || guestName.value.trim() === '') {
    return
  }

  submitting.value = true
  warn.value = ''
  fieldErrors.value = {}

  try {
    const created = await request('/api/rms/waitlist', {
      method: 'POST',
      body: {
        departure_id: departureId.value,
        cabin_category: cabinCategory.value,
        client: {
          name: guestName.value.trim(),
          email: email.value.trim() === '' ? null : email.value.trim(),
          phone: phone.value.trim() === '' ? null : phone.value.trim(),
          preferred_channel: preferred.value
        },
        adults: adults.value,
        children: children.value,
        notes: notes.value.trim() === '' ? null : notes.value.trim()
      }
    }) as WaitlistEntry

    toast.add({ title: t('holds.addedToast') })
    open.value = false
    emit('created', created)
  } catch (error: unknown) {
    const handled = applyApiFormError(error, (fields, conflict) => {
      fieldErrors.value = fields
      if (conflict !== '') {
        warn.value = conflict
      }
    })

    if (!handled || warn.value === '') {
      warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
    }
  } finally {
    submitting.value = false
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    return
  }

  reset()
  loading.value = true

  try {
    await Promise.all([loadOptions(), loadDepartures()])
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    loading.value = false
  }
})

onUnmounted(() => {
  clearTimeout(contactTimer)
})
</script>

<template>
  <UModal
    :open="open"
    :title="t('holds.addTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="onSubmit"
      >
        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>
        <div class="field">
          <label>{{ t('bookings.departure') }}</label>
          <select
            :value="departureId ?? ''"
            :disabled="loading"
            @change="departureId = Number(($event.target as HTMLSelectElement).value) || null"
          >
            <option value="">
              {{ loading ? t('bookings.loadingDepartures') : t('bookings.pickDeparture') }}
            </option>
            <option
              v-for="row in orderedDepartures"
              :key="row.id"
              :value="row.id"
            >
              {{ departureLabel(row) }}
            </option>
          </select>
        </div>
        <div class="field">
          <label>{{ t('holds.cabinType') }}</label>
          <select
            :value="cabinCategory"
            @change="cabinCategory = ($event.target as HTMLSelectElement).value as CabinCategory"
          >
            <option value="SUITE">
              {{ t('holds.suite') }}
            </option>
            <option value="OWNER">
              {{ t('holds.ownerSuite') }}
            </option>
          </select>
        </div>
        <div class="cols2">
          <div class="field">
            <label>{{ t('bookings.guestName') }}</label>
            <input
              v-model="guestName"
              type="text"
              :placeholder="t('bookings.guestPlaceholder')"
            >
            <p
              v-if="fieldErrors['client.name']"
              class="field-hint"
            >
              {{ fieldErrors['client.name'] }}
            </p>
          </div>
          <div class="field">
            <label>{{ t('bookings.email') }}</label>
            <input
              :value="email"
              type="email"
              autocomplete="off"
              @input="onEmailInput(($event.target as HTMLInputElement).value)"
            >
            <div
              v-if="contacts.length > 0"
              class="nb-suggest"
            >
              <button
                v-for="contact in contacts"
                :key="contact.id"
                type="button"
                class="nb-suggest-item"
                @click="pickContact(contact)"
              >
                {{ contact.name }}{{ contact.email ? ` · ${contact.email}` : '' }}
              </button>
            </div>
          </div>
        </div>
        <p
          v-if="existingNotice"
          class="notice"
        >
          {{ t('bookings.existingContact') }}
        </p>
        <div class="cols2">
          <div class="field">
            <label>{{ t('bookings.phone') }}</label>
            <input
              v-model="phone"
              type="text"
            >
          </div>
          <div class="field">
            <label>{{ t('bookings.preferredChannel') }}</label>
            <select
              :value="preferred"
              @change="preferred = ($event.target as HTMLSelectElement).value as PreferredChannel"
            >
              <option
                v-for="item in options?.preferred ?? []"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="cols2">
          <div class="field">
            <label>{{ t('bookings.adults') }}</label>
            <input
              v-model.number="adults"
              type="number"
              min="1"
            >
          </div>
          <div class="field">
            <label>{{ t('bookings.children') }}</label>
            <input
              v-model.number="children"
              type="number"
              min="0"
            >
          </div>
        </div>
        <div class="field">
          <label>{{ t('holds.notes') }}</label>
          <textarea
            v-model="notes"
            rows="3"
          />
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
            :disabled="submitting || departureId === null || guestName.trim() === ''"
          >
            {{ t('holds.addSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
