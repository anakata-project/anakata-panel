<script setup lang="ts">
import type {
  BookingFormOptions,
  BookingQuote,
  BookingQuoteRequest,
  BookingType,
  CabinAvailability,
  ChannelOfOrigin,
  Contact,
  CreateReservationRequest,
  CreateReservationResponse,
  Departure,
  Group,
  MainChannel,
  Paginated,
  PaymentLink,
  PreferredChannel
} from '../../types/api'
import { ApiError } from '#imports'
import { confirmUnsaved } from '../../composables/useUnsavedGuard'
import { applyApiFormError, firstApiMessage } from '../../utils/apiForm'
import { createValidationQueue } from '../../utils/validationQueue'
import { departureOptionLabel, galapagosTomorrowIso } from './bookingHelpers'
import {
  agencyOptionLabel,
  charterNoticeText,
  commissionWarning,
  createdToast,
  depositLineText,
  depositMethodOptions,
  existingContactSelected,
  heldCreatedToast,
  isTradeMain,
  quoteRequestPayload,
  showBackToBack,
  showGroupNameField,
  showGroupRow,
  tradeCreateFields,
  type ReservationCabinRow
} from './newReservationHelpers'

const CONTACT_DEBOUNCE_MS = 300

export type ExtraCabinRow = ReservationCabinRow & { key: number }

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  prefill?: { departureId?: number, cabinCode?: string } | null
}>()

const emit = defineEmits<{
  created: [response: CreateReservationResponse]
}>()

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const options = ref<BookingFormOptions | null>(null)
const departures = ref<Array<Departure>>([])
const groups = ref<Array<Group>>([])
const contacts = ref<Array<Contact>>([])
const selectedContact = ref<Contact | null>(null)
const loading = ref(false)
const quoting = ref(false)
const submitting = ref(false)
const dirty = ref(false)
const warn = ref('')
const fieldErrors = ref<Record<string, string>>({})
const quote = ref<BookingQuote | null>(null)

const type = ref<BookingType>('CABIN')
const mainChannel = ref<MainChannel | ''>('')
const origin = ref<ChannelOfOrigin | ''>('')
const guestName = ref('')
const email = ref('')
const phone = ref('')
const preferred = ref<PreferredChannel>('EMAIL')
const departureId = ref<number | null>(null)
const adults = ref(2)
const children = ref(0)
const cabinCode = ref('')
const extras = ref<Array<ExtraCabinRow>>([])
const existingGroupId = ref<number | null>(null)
const groupName = ref('')
const backToBack = ref(false)
const notes = ref('')
const agencyId = ref<number | null>(null)
const commissionPct = ref(10)
const depositMethod = ref<'card' | 'wire'>('card')
const phase = ref<'form' | 'success'>('form')
const created = ref<CreateReservationResponse | null>(null)
const paymentLinks = ref<Array<PaymentLink>>([])
const linkError = ref('')
const linkSkipped = ref(false)

let extraKey = 0
let contactTimer: ReturnType<typeof setTimeout> | undefined

const selectedDeparture = computed(() => {
  return departures.value.find(item => item.id === departureId.value) ?? null
})

const cabins = computed<Array<CabinAvailability>>(() => {
  return selectedDeparture.value?.availability.cabins ?? []
})

const isCharter = computed(() => type.value === 'CHARTER')

const cabinRows = computed<Array<ReservationCabinRow>>(() => [
  { cabinCode: cabinCode.value, adults: adults.value, children: children.value },
  ...extras.value
])

const groupVisible = computed(() => {
  return showGroupRow(isCharter.value, cabinRows.value.length, existingGroupId.value)
})

const backToBackVisible = computed(() => {
  return showBackToBack(isCharter.value, selectedDeparture.value?.festive ?? false)
})

const isTrade = computed(() => {
  if (mainChannel.value === '' || options.value === null) {
    return false
  }

  return isTradeMain(mainChannel.value, options.value.main)
})

const capPct = computed(() => options.value?.commission.cap_pct ?? 0)

const defaultPct = computed(() => options.value?.commission.default_pct ?? 0)

const wireWindowHours = computed(() => options.value?.payments.wire_window_hours ?? 0)

const capWarning = computed(() => commissionWarning(commissionPct.value, capPct.value))

const methodOptions = computed(() => depositMethodOptions(wireWindowHours.value))

const canRecordLink = computed(() => can('payments.record'))

const existingNotice = computed(() => {
  return existingContactSelected(email.value, selectedContact.value?.email ?? null)
})

const quotePayload = computed(() => {
  return quoteRequestPayload(
    departureId.value,
    type.value,
    cabinRows.value,
    backToBack.value,
    mainChannel.value
  )
})

const quoteErrors = computed(() => {
  if (quote.value === null) {
    return []
  }

  return [
    ...quote.value.warnings,
    ...quote.value.cabins.flatMap(party => [...party.errors, ...party.warnings])
  ]
})

const quoteHasErrors = computed(() => {
  return quote.value !== null && quote.value.cabins.some(party => party.errors.length > 0)
})

const canCreate = computed(() => {
  return !submitting.value
    && !quoting.value
    && guestName.value.trim() !== ''
    && mainChannel.value !== ''
    && origin.value !== ''
    && (!isTrade.value || agencyId.value !== null)
    && quotePayload.value !== null
    && quote.value !== null
    && !quoteHasErrors.value
    && quote.value.total !== null
})

const guestLabel = computed(() => {
  return groupVisible.value ? t('bookings.leadGuest') : t('bookings.guestName')
})

const childrenLabel = computed(() => {
  const guests = options.value?.guests

  if (guests === undefined) {
    return t('bookings.children')
  }

  return t('bookings.childrenRange', {
    min: String(guests.child_min_age),
    max: String(guests.child_max_age)
  })
})

const typeItems = computed(() => [
  { label: t('bookings.typeCabin'), value: 'CABIN' },
  { label: t('bookings.typeCharter'), value: 'CHARTER' }
])

const mainChannelItems = computed(() => (options.value?.main ?? []).map(item => ({
  label: item.label,
  value: item.value
})))

const originItems = computed(() => [
  ...(options.value?.origin ?? []).map(group => [
    { type: 'label' as const, label: group.group },
    ...group.options.map(option => ({ label: option.label, value: option.value }))
  ])
])

const agencyItems = computed(() => [
  { label: t('bookings.pickAgency'), value: null as number | null },
  ...(options.value?.agencies ?? []).map(agency => ({
    label: agencyOptionLabel(agency, capPct.value),
    value: agency.id
  }))
])

const preferredItems = computed(() => (options.value?.preferred ?? []).map(item => ({
  label: item.label,
  value: item.value
})))

const departureItems = computed(() => [
  {
    label: loading.value ? t('bookings.loadingDepartures') : t('bookings.pickDeparture'),
    value: null as number | null
  },
  ...departures.value.map(item => ({
    label: departureOptionLabel(item.date, item.yacht.name, item.itinerary.name, item.festive, shortDate),
    value: item.id
  }))
])

const cabinItems = computed(() => [
  { label: t('bookings.pickCabin'), value: '' },
  ...cabins.value.map(item => ({
    label: `${item.cabin.label}${cabinEnabled(item) ? '' : ` · ${t('bookings.cabinTaken')}`}`,
    value: item.cabin.code,
    disabled: !cabinEnabled(item)
  }))
])

const extraCabinItems = computed(() => [
  { label: t('bookings.pickCabin'), value: '' },
  ...cabins.value.map(item => ({
    label: item.cabin.label,
    value: item.cabin.code,
    disabled: !cabinEnabled(item)
  }))
])

const depositMethodItems = computed(() => methodOptions.value.map(item => ({
  label: item.label,
  value: item.value
})))

const groupItems = computed(() => [
  { label: t('bookings.newReservationOption'), value: null as number | null },
  ...groups.value.map(group => ({
    label: t('bookings.addToGroup', { reference: group.reference, name: group.name }),
    value: group.id
  }))
])

const charterTerms = computed(() => quote.value?.terms.charter ?? null)

const depositLine = computed(() => {
  if (quote.value === null || quote.value.deposit === null) {
    return ''
  }

  const pct = quote.value.cabins.find(party => party.quote !== null)?.quote?.deposit_pct
    ?? 0

  return depositLineText(pct, money(quote.value.deposit), quote.value.terms.balance_days)
})

const queue = createValidationQueue<BookingQuoteRequest, BookingQuote | null>(
  async (payload) => {
    try {
      return await request('/api/rms/bookings/quote', {
        method: 'POST',
        body: payload
      }) as BookingQuote
    } catch (error: unknown) {
      warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
      return null
    }
  },
  (result) => {
    if (result !== null) {
      quote.value = result
    }
  },
  {
    delayMs: 400,
    onPending: (pending) => {
      quoting.value = pending
    }
  }
)

function shortDate(iso: string): string {
  return format(iso, 'short')
}

function cabinEnabled(item: CabinAvailability): boolean {
  return item.state === 'FREE'
}

function reset(): void {
  queue.invalidate()
  type.value = 'CABIN'
  mainChannel.value = (options.value?.main[0]?.value ?? '') as MainChannel | ''
  origin.value = (options.value?.origin[0]?.options[0]?.value ?? '') as ChannelOfOrigin | ''
  guestName.value = ''
  email.value = ''
  phone.value = ''
  preferred.value = 'EMAIL'
  departureId.value = null
  adults.value = 2
  children.value = 0
  cabinCode.value = ''
  extras.value = []
  extraKey = 0
  existingGroupId.value = null
  groupName.value = ''
  backToBack.value = false
  notes.value = ''
  agencyId.value = null
  commissionPct.value = options.value?.commission.default_pct ?? 10
  depositMethod.value = 'card'
  phase.value = 'form'
  created.value = null
  paymentLinks.value = []
  linkError.value = ''
  linkSkipped.value = false
  contacts.value = []
  selectedContact.value = null
  groups.value = []
  quote.value = null
  warn.value = ''
  fieldErrors.value = {}
  dirty.value = false
}

function applyPrefill(): void {
  const next = props.prefill

  if (next === null || next === undefined) {
    return
  }

  if (next.departureId !== undefined) {
    departureId.value = next.departureId
  }

  if (next.cabinCode !== undefined) {
    cabinCode.value = next.cabinCode
  }
}

async function loadOptions(): Promise<void> {
  options.value = await request('/api/rms/bookings/form-options') as BookingFormOptions

  if (mainChannel.value === '' && options.value.main[0] !== undefined) {
    mainChannel.value = options.value.main[0].value as MainChannel
  }

  if (origin.value === '' && options.value.origin[0]?.options[0] !== undefined) {
    origin.value = options.value.origin[0].options[0].value as ChannelOfOrigin
  }
}

async function loadDepartures(): Promise<void> {
  const from = galapagosTomorrowIso(new Date(), (value, style, options) => format(value, style, options))
  const collected: Array<Departure> = []
  let page = 1
  let last = 1

  do {
    const result = await request(
      `/api/rms/departures?from=${from}&with_cabins=1&per_page=100&page=${page}`
    ) as Paginated<Departure>
    collected.push(...result.data)
    last = result.meta.last_page
    page += 1
  } while (page <= last)

  departures.value = collected
}

async function loadGroups(): Promise<void> {
  if (departureId.value === null) {
    groups.value = []
    return
  }

  const result = await request(`/api/rms/groups?departure_id=${String(departureId.value)}`) as { data: Array<Group> }
  groups.value = result.data
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

function addCabin(): void {
  extraKey += 1
  extras.value = [...extras.value, { key: extraKey, cabinCode: '', adults: 2, children: 0 }]
}

function removeCabin(key: number): void {
  extras.value = extras.value.filter(row => row.key !== key)
}

function updateExtra(key: number, patch: Partial<ReservationCabinRow>): void {
  extras.value = extras.value.map((row) => {
    return row.key === key ? { ...row, ...patch } : row
  })
}

function scheduleQuote(): void {
  const payload = quotePayload.value

  if (payload === null) {
    queue.invalidate()
    quote.value = null
    return
  }

  queue.schedule(payload)
}

function onAgencyChange(value: number | null): void {
  agencyId.value = value
  const agency = options.value?.agencies.find(item => item.id === value)
  commissionPct.value = agency?.commission_pct ?? defaultPct.value
}

function onTypeUpdate(value: string | number | null | undefined): void {
  if (typeof value === 'string') {
    type.value = value as BookingType
  }
}

function onMainChannelUpdate(value: string | number | null | undefined): void {
  if (typeof value === 'string') {
    mainChannel.value = value as MainChannel
  }
}

function onOriginUpdate(value: string | number | null | undefined): void {
  if (typeof value === 'string') {
    origin.value = value as ChannelOfOrigin
  }
}

function onPreferredUpdate(value: string | number | null | undefined): void {
  if (typeof value === 'string') {
    preferred.value = value as PreferredChannel
  }
}

function onDepartureUpdate(value: number | string | null | undefined): void {
  departureId.value = typeof value === 'number' ? value : null
}

function onCabinUpdate(value: string | number | null | undefined): void {
  cabinCode.value = typeof value === 'string' ? value : ''
}

function onDepositMethodUpdate(value: string | number | null | undefined): void {
  if (value === 'card' || value === 'wire') {
    depositMethod.value = value
  }
}

function onExtraCabinUpdate(key: number, value: string | number | null | undefined): void {
  updateExtra(key, { cabinCode: typeof value === 'string' ? value : '' })
}

function onGroupUpdate(value: number | string | null | undefined): void {
  existingGroupId.value = typeof value === 'number' ? value : null
}

function onAgencyUpdate(value: number | string | null | undefined): void {
  onAgencyChange(typeof value === 'number' ? value : null)
}

async function copyCreatedLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url)
  toast.add({ title: t('bookings.linkCopiedToast') })
}

function finish(): void {
  const response = created.value

  if (response === null) {
    open.value = false
    return
  }

  const first = response.bookings[0]
  const overCap = first !== undefined
    && first.status === 'ON_HOLD_AGENCY'
    && !first.commission_approved

  toast.add({
    title: overCap
      ? heldCreatedToast(first.commission_pct ?? commissionPct.value, first.commission_cap_pct)
      : createdToast(response.bookings, response.group?.reference ?? null)
  })
  dirty.value = false
  phase.value = 'form'
  open.value = false
  emit('created', response)
  created.value = null
}

function onUpdateOpen(next: boolean): void {
  if (!next && phase.value === 'success' && created.value !== null) {
    finish()
    return
  }

  if (!next && dirty.value && !confirmUnsaved(t('bookings.leaveUnsaved'))) {
    return
  }

  open.value = next
}

async function submit(): Promise<void> {
  const payload = quotePayload.value

  if (!canCreate.value || payload === null || mainChannel.value === '' || origin.value === '') {
    return
  }

  submitting.value = true
  warn.value = ''
  fieldErrors.value = {}

  const body: CreateReservationRequest = {
    ...payload,
    ...tradeCreateFields(isTrade.value, agencyId.value, commissionPct.value),
    client: {
      name: guestName.value.trim(),
      email: email.value.trim() === '' ? null : email.value.trim(),
      phone: phone.value.trim() === '' ? null : phone.value.trim(),
      preferred_channel: preferred.value
    },
    main_channel: mainChannel.value,
    channel_of_origin: origin.value,
    internal_notes: notes.value.trim() === '' ? null : notes.value.trim()
  }

  if (!isCharter.value && existingGroupId.value !== null) {
    body.group = { existing_group_id: existingGroupId.value }
  } else if (!isCharter.value && cabinRows.value.length >= 2) {
    body.group = { name: groupName.value.trim() === '' ? null : groupName.value.trim() }
  }

  try {
    const response = await request('/api/rms/bookings', {
      method: 'POST',
      body
    }) as CreateReservationResponse

    created.value = response
    paymentLinks.value = []
    linkError.value = ''
    linkSkipped.value = false

    if (depositMethod.value === 'card') {
      if (!canRecordLink.value) {
        linkSkipped.value = true
      } else {
        for (const booking of response.bookings) {
          try {
            const link = await request(`/api/rms/bookings/${String(booking.id)}/payment-link`, {
              method: 'POST',
              body: { kind: 'DEPOSIT' }
            }) as PaymentLink
            paymentLinks.value = [...paymentLinks.value, link]
          } catch {
            linkError.value = t('bookings.linkFailed')
          }
        }
      }
    }

    dirty.value = false
    phase.value = 'success'
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 409) {
      warn.value = firstApiMessage(error) ?? error.message
      await loadDepartures()
      scheduleQuote()
    } else if (!applyApiFormError(error, (fields, message) => {
      fieldErrors.value = fields
      warn.value = message
    })) {
      warn.value = error instanceof Error ? error.message : ''
    }
  } finally {
    submitting.value = false
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    queue.invalidate()
    clearTimeout(contactTimer)
    return
  }

  loading.value = true
  warn.value = ''

  try {
    reset()
    await Promise.all([loadOptions(), loadDepartures()])
    applyPrefill()
    await loadGroups()
    await nextTick()
    dirty.value = false
    scheduleQuote()
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    loading.value = false
  }
}, { immediate: true })

watch(type, (next) => {
  if (next === 'CHARTER') {
    extras.value = []
    cabinCode.value = ''
    existingGroupId.value = null
    groupName.value = ''
  }
})

watch(backToBackVisible, (visible) => {
  if (!visible) {
    backToBack.value = false
  }
})

watch(isTrade, (trade) => {
  if (!trade) {
    agencyId.value = null
    commissionPct.value = defaultPct.value
  }
})

watch(departureId, () => {
  existingGroupId.value = null
  void loadGroups()
})

watch(quotePayload, () => {
  if (!open.value) {
    return
  }

  scheduleQuote()
})

onUnmounted(() => {
  queue.invalidate()
  clearTimeout(contactTimer)
})
</script>

<template>
  <UModal
    :open="open"
    :title="t('bookings.newTitle')"
    @update:open="onUpdateOpen"
  >
    <template #body>
      <div
        v-if="phase === 'success'"
        class="modal-form"
      >
        <p class="notice">
          {{ created
            ? createdToast(created.bookings, created.group?.reference ?? null)
            : '' }}
        </p>
        <div
          v-if="created?.bookings[0]?.status === 'ON_HOLD_AGENCY'"
          class="warnbox"
        >
          {{ heldCreatedToast(
            created.bookings[0].commission_pct ?? commissionPct,
            created.bookings[0].commission_cap_pct
          ) }}
        </div>
        <template v-if="depositMethod === 'card'">
          <p
            v-if="linkSkipped"
            class="notice"
          >
            {{ t('bookings.linkFinanceCreates') }}
          </p>
          <template v-else>
            <ul
              v-if="paymentLinks.length > 0"
              class="pay-links"
            >
              <li
                v-for="link in paymentLinks"
                :key="link.id"
                class="pay-link-row"
              >
                <span class="pay-link-url">{{ link.url }}</span>
                <button
                  type="button"
                  class="mini"
                  @click="copyCreatedLink(link.url)"
                >
                  {{ t('bookings.copyLink') }}
                </button>
              </li>
            </ul>
            <p
              v-if="linkError === '' && paymentLinks.length > 0"
              class="notice"
            >
              {{ t('bookings.linkManual') }}
            </p>
            <div
              v-if="linkError"
              class="warnbox"
            >
              {{ linkError }}
            </div>
          </template>
        </template>
        <p
          v-else
          class="notice"
        >
          {{ t('bookings.wireIssuedManual', { hours: String(wireWindowHours) }) }}
        </p>
        <div class="modal-actions">
          <UButton @click="finish">
            {{ t('bookings.createdDone') }}
          </UButton>
        </div>
      </div>
      <form
        v-else
        class="modal-form"
        @submit.prevent="submit"
        @input="dirty = true"
        @change="dirty = true"
      >
        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>

        <div class="cols2">
          <div class="field">
            <label for="nb-booking-type">{{ t('bookings.bookingType') }}</label>
            <USelect
              id="nb-booking-type"
              :model-value="type"
              class="w-full"
              :items="typeItems"
              @update:model-value="onTypeUpdate"
            />
          </div>
          <div class="field">
            <label for="nb-main-channel">{{ t('bookings.mainChannel') }}</label>
            <USelect
              id="nb-main-channel"
              :model-value="mainChannel"
              class="w-full"
              :items="mainChannelItems"
              @update:model-value="onMainChannelUpdate"
            />
            <p
              v-if="fieldErrors.main_channel"
              class="field-hint"
            >
              {{ fieldErrors.main_channel }}
            </p>
          </div>
        </div>

        <div class="field">
          <label for="nb-origin-channel">{{ t('bookings.originChannel') }}</label>
          <USelect
            id="nb-origin-channel"
            :model-value="origin"
            class="w-full"
            :items="originItems"
            @update:model-value="onOriginUpdate"
          />
        </div>

        <template v-if="isTrade">
          <div class="cols2">
            <div class="field">
              <label for="nb-agent">{{ t('bookings.agency') }}</label>
              <USelect
                id="nb-agent"
                :model-value="agencyId"
                class="w-full"
                :items="agencyItems"
                @update:model-value="onAgencyUpdate"
              />
              <p
                v-if="fieldErrors.agency_id"
                class="field-hint"
              >
                {{ fieldErrors.agency_id }}
              </p>
            </div>
            <div class="field">
              <label for="nb-comm">{{ t('bookings.commissionPct') }}</label>
              <input
                id="nb-comm"
                v-model.number="commissionPct"
                type="number"
                min="0"
              >
              <p
                v-if="fieldErrors.commission_pct"
                class="field-hint"
              >
                {{ fieldErrors.commission_pct }}
              </p>
            </div>
          </div>
          <div
            v-if="capWarning"
            class="warnbox"
          >
            {{ capWarning }}
          </div>
          <p class="notice">
            {{ t('bookings.agencyNetNotice') }}
          </p>
        </template>

        <div class="cols2">
          <div class="field">
            <label for="nb-guest-name">{{ guestLabel }}</label>
            <input
              id="nb-guest-name"
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
            <label for="nb-email">{{ t('bookings.email') }}</label>
            <input
              id="nb-email"
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
            <label for="nb-phone">{{ t('bookings.phone') }}</label>
            <input
              id="nb-phone"
              v-model="phone"
              type="text"
            >
          </div>
          <div class="field">
            <label for="nb-preferred-channel">{{ t('bookings.preferredChannel') }}</label>
            <USelect
              id="nb-preferred-channel"
              :model-value="preferred"
              class="w-full"
              :items="preferredItems"
              @update:model-value="onPreferredUpdate"
            />
          </div>
        </div>

        <div class="field">
          <label for="nb-departure">{{ t('bookings.departure') }}</label>
          <USelect
            id="nb-departure"
            :model-value="departureId"
            class="w-full"
            :items="departureItems"
            :disabled="loading"
            @update:model-value="onDepartureUpdate"
          />
        </div>

        <div class="cols2">
          <div class="field">
            <label for="nb-adults">{{ t('bookings.adults') }}</label>
            <input
              id="nb-adults"
              v-model.number="adults"
              type="number"
              min="1"
              max="16"
            >
          </div>
          <div class="field">
            <label for="nb-children">{{ childrenLabel }}</label>
            <input
              id="nb-children"
              v-model.number="children"
              type="number"
              min="0"
              max="16"
            >
          </div>
        </div>

        <div
          v-if="quoteErrors.length > 0"
          class="warnbox"
        >
          <span
            v-for="item in quoteErrors"
            :key="item"
          >{{ item }}</span>
        </div>

        <div class="cols2">
          <div
            v-if="!isCharter"
            class="field"
          >
            <label for="nb-cabin">{{ t('bookings.cabin') }}</label>
            <USelect
              id="nb-cabin"
              :model-value="cabinCode"
              class="w-full"
              :items="cabinItems"
              :disabled="selectedDeparture === null"
              @update:model-value="onCabinUpdate"
            />
          </div>
          <div class="field">
            <label for="nb-deposit-method">{{ t('bookings.depositMethod') }}</label>
            <USelect
              id="nb-deposit-method"
              :model-value="depositMethod"
              class="w-full"
              :items="depositMethodItems"
              @update:model-value="onDepositMethodUpdate"
            />
          </div>
        </div>

        <p
          v-if="isCharter && charterTerms"
          class="notice"
        >
          {{ charterNoticeText(charterTerms) }}
        </p>

        <div
          v-if="!isCharter && extras.length > 0"
          class="nb-extra"
        >
          <div
            v-for="(row, index) in extras"
            :key="row.key"
            class="nbx"
          >
            <div class="field">
              <label :for="`nb-extra-cabin-${row.key}`">{{ t('bookings.extraCabin', { n: String(index + 2) }) }}</label>
              <USelect
                :id="`nb-extra-cabin-${row.key}`"
                :model-value="row.cabinCode"
                class="w-full"
                :items="extraCabinItems"
                @update:model-value="onExtraCabinUpdate(row.key, $event)"
              />
            </div>
            <div class="field">
              <label :for="`nb-extra-adults-${row.key}`">{{ t('bookings.adults') }}</label>
              <input
                :id="`nb-extra-adults-${row.key}`"
                :value="row.adults"
                type="number"
                min="1"
                max="4"
                @input="updateExtra(row.key, { adults: Number(($event.target as HTMLInputElement).value) })"
              >
            </div>
            <div class="field">
              <label :for="`nb-extra-children-${row.key}`">{{ t('bookings.children') }}</label>
              <input
                :id="`nb-extra-children-${row.key}`"
                :value="row.children"
                type="number"
                min="0"
                max="3"
                @input="updateExtra(row.key, { children: Number(($event.target as HTMLInputElement).value) })"
              >
            </div>
            <button
              type="button"
              class="xbtn"
              :aria-label="t('bookings.removeCabin')"
              @click="removeCabin(row.key)"
            >
              ×
            </button>
          </div>
        </div>

        <div
          v-if="!isCharter"
          class="nb-addrow"
        >
          <UButton
            variant="outline"
            @click="addCabin"
          >
            {{ t('bookings.addCabin') }}
          </UButton>
          <USelect
            class="tsel"
            :model-value="existingGroupId"
            :items="groupItems"
            @update:model-value="onGroupUpdate"
          />
        </div>

        <template v-if="groupVisible">
          <div
            v-if="showGroupNameField(existingGroupId)"
            class="field"
          >
            <label for="nb-group-name">{{ t('bookings.groupName') }}</label>
            <input
              id="nb-group-name"
              v-model="groupName"
              type="text"
              :placeholder="t('bookings.groupPlaceholder')"
            >
          </div>
          <p class="notice">
            {{ t('bookings.ops008') }}
          </p>
        </template>

        <label
          v-if="backToBackVisible"
          class="chkline"
        >
          <input
            v-model="backToBack"
            type="checkbox"
          >
          {{ t('bookings.backToBack') }}
        </label>

        <div class="prevbox nb-price">
          <div class="prevl">
            {{ t('bookings.priceHeader') }}
          </div>
          <p
            v-if="quotePayload === null && departureId !== null && !isCharter"
            class="pline pline-err"
          >
            {{ t('bookings.pickACabin') }}
          </p>
          <template v-else-if="quote">
            <template
              v-for="(party, index) in quote.cabins"
              :key="`${party.cabin_code ?? 'charter'}-${index}`"
            >
              <div
                v-if="quote.cabins.length > 1"
                class="prevl"
              >
                {{ t('bookings.cabinQuote', {
                  n: String(index + 1),
                  cabin: party.cabin_label.toUpperCase(),
                  party: party.children > 0
                    ? t('bookings.partyMix', { adults: String(party.adults), children: String(party.children) })
                    : t('bookings.partyAdults', { adults: String(party.adults) })
                }) }}
              </div>
              <div
                v-for="line in party.quote?.lines ?? []"
                :key="`${index}-${line.code}-${line.label}`"
                class="pline"
                :class="{ off: line.amount < 0 }"
              >
                <span>{{ line.label }}</span>
                <span>{{ money(line.amount) }}</span>
              </div>
              <div
                v-for="item in party.errors"
                :key="`${index}-${item}`"
                class="pline pline-err"
              >
                ⚠ {{ item }}
              </div>
            </template>
            <div
              v-if="quote.total !== null"
              class="pline tot"
            >
              <span>{{ quote.cabins.length > 1
                ? t('bookings.groupTotalLine', { n: String(quote.cabins.length) })
                : t('bookings.total') }}</span>
              <span>{{ money(quote.total) }}</span>
            </div>
            <div
              v-if="depositLine !== ''"
              class="pline"
            >
              <span>{{ depositLine }}</span>
            </div>
          </template>
        </div>

        <div class="field">
          <label for="nb-notes">{{ t('bookings.internalNotes') }}</label>
          <textarea
            id="nb-notes"
            v-model="notes"
            rows="2"
          />
        </div>

        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="onUpdateOpen(false)"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="!canCreate"
          >
            {{ t('bookings.createReservation') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
