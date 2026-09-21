<script setup lang="ts">
import type {
  ChangeHistoryEntry,
  Itinerary,
  Offer,
  Paginated
} from '../../types/api'
import { applyApiFormError, firstApiMessage, type FormFieldErrors } from '../../utils/apiForm'
import { confirmUnsaved } from '../../composables/useUnsavedGuard'
import HistoryTimeline from '../history/HistoryTimeline.vue'
import ReasonModal from '../bookings/ReasonModal.vue'
import {
  emptyOfferForm,
  formFromOffer,
  OFFER_CABIN_TYPES,
  OFFER_CHANNELS,
  OFFER_TYPES,
  offerFormToPayload,
  offerStatusPillClass,
  type OfferForm
} from './offerHelpers'

const isOpen = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  source: Offer | null
  itineraries: Array<Itinerary>
  canManage: boolean
  canApprove: boolean
}>()

const emit = defineEmits<{
  saved: [offer: Offer]
}>()

type DrawerTab = 'offer' | 'history'
type ReasonKind = 'approve' | 'reject'

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const form = ref<OfferForm>(emptyOfferForm())
const snapshot = ref('')
const current = ref<Offer | null>(null)
const tab = ref<DrawerTab>('offer')
const warn = ref('')
const fieldErrors = ref<FormFieldErrors>({})
const saving = ref(false)
const history = ref<Array<ChangeHistoryEntry>>([])
const historyPage = ref(1)
const historyLast = ref(1)
const historyLoading = ref(false)
const reasonOpen = ref(false)
const reasonKind = ref<ReasonKind>('approve')
const reasonError = ref('')
const reasonSubmitting = ref(false)

const isNew = computed(() => current.value === null)
const canEdit = computed(() => props.canManage)
const dirty = computed(() => JSON.stringify(form.value) !== snapshot.value)
const isValue = computed(() => form.value.type === 'VALUE')
const priceAffecting = computed(() => form.value.type !== 'VALUE')
const storedStatus = computed(() => current.value?.stored_status ?? 'DRAFT')
const derivedStatus = computed(() => current.value?.status ?? 'DRAFT')

const title = computed(() => {
  if (isNew.value) {
    return t('offers.newTitle')
  }

  return current.value?.code ?? t('offers.newTitle')
})

const nonFestiveCodes = computed(() => {
  return props.itineraries.filter(item => !item.festive).map(item => item.code)
})

function snapshotOf(next: OfferForm): string {
  return JSON.stringify(next)
}

function resetFrom(source: Offer | null): void {
  const next = source === null
    ? emptyOfferForm(nonFestiveCodes.value)
    : formFromOffer(source)

  form.value = next
  snapshot.value = snapshotOf(next)
  current.value = source
  tab.value = 'offer'
  warn.value = ''
  fieldErrors.value = {}
  history.value = []
  historyPage.value = 1
  historyLast.value = 1
}

watch(
  () => [isOpen.value, props.source] as const,
  ([open]) => {
    if (open) {
      resetFrom(props.source)
    }
  }
)

watch(nonFestiveCodes, (codes) => {
  if (isOpen.value && isNew.value && form.value.itinerary_codes.length === 0 && codes.length > 0) {
    form.value.itinerary_codes = [...codes]
    snapshot.value = snapshotOf(form.value)
  }
})

useUnsavedGuard(dirty, () => t('config.leaveUnsaved'))

function onUpdateOpen(next: boolean): void {
  if (!next && dirty.value && !confirmUnsaved(t('config.leaveUnsaved'))) {
    return
  }

  isOpen.value = next
}

function toggleCabin(code: (typeof OFFER_CABIN_TYPES)[number], checked: boolean): void {
  if (checked) {
    if (!form.value.cabin_types.includes(code)) {
      form.value.cabin_types = [...form.value.cabin_types, code]
    }

    return
  }

  form.value.cabin_types = form.value.cabin_types.filter(item => item !== code)
}

function toggleItinerary(code: string, checked: boolean): void {
  if (checked) {
    if (!form.value.itinerary_codes.includes(code)) {
      form.value.itinerary_codes = [...form.value.itinerary_codes, code]
    }

    return
  }

  form.value.itinerary_codes = form.value.itinerary_codes.filter(item => item !== code)
}

function applySaved(offer: Offer): void {
  current.value = offer
  form.value = formFromOffer(offer)
  snapshot.value = snapshotOf(form.value)
  fieldErrors.value = {}
  warn.value = ''
  emit('saved', offer)
}

async function save(asDraft: boolean): Promise<void> {
  if (!canEdit.value) {
    return
  }

  saving.value = true
  fieldErrors.value = {}
  warn.value = ''

  try {
    const body = offerFormToPayload(form.value, asDraft)
    const offer = current.value === null
      ? await request('/api/rms/offers', { method: 'POST', body }) as Offer
      : await request(`/api/rms/offers/${current.value.id}`, { method: 'PATCH', body }) as Offer

    applySaved(offer)

    if (asDraft) {
      toast.add({ title: t('offers.draftToast') })
    } else if (offer.status === 'PENDING') {
      toast.add({ title: t('offers.pendingToast') })
    } else {
      toast.add({ title: t('offers.liveToast') })
    }
  } catch (error: unknown) {
    if (!applyApiFormError(error, (fields, conflict) => {
      fieldErrors.value = fields
      warn.value = conflict
    })) {
      warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
    }
  } finally {
    saving.value = false
  }
}

async function pauseOrResume(action: 'pause' | 'resume'): Promise<void> {
  if (current.value === null || !canEdit.value) {
    return
  }

  saving.value = true
  warn.value = ''

  try {
    const offer = await request(`/api/rms/offers/${current.value.id}/${action}`, {
      method: 'POST'
    }) as Offer

    applySaved(offer)

    if (action === 'pause') {
      toast.add({ title: t('offers.pausedToast') })
    } else if (offer.status === 'PENDING') {
      toast.add({ title: t('offers.resumedPendingToast') })
    } else {
      toast.add({ title: t('offers.resumedToast') })
    }
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    saving.value = false
  }
}

function startReason(kind: ReasonKind): void {
  reasonKind.value = kind
  reasonError.value = ''
  reasonOpen.value = true
}

async function submitReason(reason: string): Promise<void> {
  if (current.value === null) {
    return
  }

  reasonSubmitting.value = true
  reasonError.value = ''

  try {
    const path = reasonKind.value === 'approve' ? 'approve' : 'reject'
    const offer = await request(`/api/rms/offers/${current.value.id}/${path}`, {
      method: 'POST',
      body: { reason }
    }) as Offer

    applySaved(offer)
    reasonOpen.value = false
    toast.add({
      title: reasonKind.value === 'approve' ? t('offers.approvedToast') : t('offers.rejectedToast')
    })
    await loadHistory(true)
  } catch (error: unknown) {
    reasonError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    reasonSubmitting.value = false
  }
}

async function loadHistory(reset: boolean): Promise<void> {
  if (current.value === null) {
    return
  }

  if (reset) {
    historyPage.value = 1
    history.value = []
  }

  historyLoading.value = true

  try {
    const result = await request(
      `/api/rms/offers/${current.value.id}/history?page=${historyPage.value}`
    ) as Paginated<ChangeHistoryEntry>
    history.value = reset ? result.data : [...history.value, ...result.data]
    historyLast.value = result.meta.last_page
  } finally {
    historyLoading.value = false
  }
}

watch(tab, (next) => {
  if (next === 'history' && current.value !== null && history.value.length === 0) {
    void loadHistory(true)
  }
})

function fieldError(name: string): string {
  return fieldErrors.value[name] ?? ''
}
</script>

<template>
  <USlideover
    :open="isOpen"
    class="history-drawer"
    @update:open="onUpdateOpen"
  >
    <template #header>
      <div>
        <h2>{{ title }}</h2>
        <div class="bid">
          <template v-if="isNew">
            {{ t('offers.newBid') }}
          </template>
          <template v-else-if="current">
            {{ current.reference }} ·
            <span
              class="pill"
              :class="offerStatusPillClass(derivedStatus)"
            >{{ t(`offers.status.${derivedStatus}`) }}</span>
          </template>
        </div>
      </div>
    </template>

    <template #body>
      <div
        v-if="!isNew"
        class="dtabs"
      >
        <button
          type="button"
          class="dtab"
          :class="{ on: tab === 'offer' }"
          @click="tab = 'offer'"
        >
          {{ t('offers.tabOffer') }}
        </button>
        <button
          type="button"
          class="dtab"
          :class="{ on: tab === 'history' }"
          @click="tab = 'history'"
        >
          {{ t('offers.tabHistory') }}
        </button>
      </div>

      <template v-if="tab === 'offer'">
        <p
          v-if="!canEdit"
          class="notice"
        >
          {{ t('offers.viewOnly') }}
        </p>

        <fieldset
          class="edfs"
          :disabled="!canEdit"
        >
          <div class="sec">
            <h4>{{ t('offers.sectionOffer') }}</h4>
            <div class="cols2">
              <div class="field">
                <label for="of-code">{{ t('offers.code') }}</label>
                <input
                  id="of-code"
                  v-model="form.code"
                  class="of-code"
                  maxlength="20"
                  :placeholder="t('offers.codePlaceholder')"
                >
                <p
                  v-if="fieldError('code')"
                  class="pline-err"
                >
                  {{ fieldError('code') }}
                </p>
              </div>
              <div class="field">
                <label for="of-name">{{ t('offers.name') }}</label>
                <input
                  id="of-name"
                  v-model="form.name"
                >
                <p
                  v-if="fieldError('name')"
                  class="pline-err"
                >
                  {{ fieldError('name') }}
                </p>
              </div>
            </div>
            <div class="cols2">
              <div class="field">
                <label for="of-type">{{ t('offers.type') }}</label>
                <select
                  id="of-type"
                  v-model="form.type"
                >
                  <option
                    v-for="item in OFFER_TYPES"
                    :key="item"
                    :value="item"
                  >
                    {{ t(`offers.types.${item}`) }}
                  </option>
                </select>
                <p
                  v-if="fieldError('type')"
                  class="pline-err"
                >
                  {{ fieldError('type') }}
                </p>
              </div>
              <div
                v-if="!isValue"
                class="field"
              >
                <label for="of-val">{{ t('offers.value') }}</label>
                <input
                  id="of-val"
                  v-model.number="form.value"
                  type="number"
                  min="0"
                  step="1"
                >
                <p
                  v-if="fieldError('value')"
                  class="pline-err"
                >
                  {{ fieldError('value') }}
                </p>
              </div>
            </div>
            <div
              v-if="isValue"
              class="field"
            >
              <label for="of-vt">{{ t('offers.valueText') }}</label>
              <input
                id="of-vt"
                v-model="form.value_text"
                :placeholder="t('offers.valueTextPlaceholder')"
              >
              <p
                v-if="fieldError('value_text')"
                class="pline-err"
              >
                {{ fieldError('value_text') }}
              </p>
            </div>
          </div>

          <div class="sec">
            <h4>{{ t('offers.sectionApplies') }}</h4>
            <div class="cols2">
              <div class="field">
                <label for="of-chan">{{ t('offers.channel') }}</label>
                <select
                  id="of-chan"
                  v-model="form.channel"
                >
                  <option
                    v-for="item in OFFER_CHANNELS"
                    :key="item"
                    :value="item"
                  >
                    {{ t(`offers.channels.${item}`) }}
                  </option>
                </select>
                <p
                  v-if="fieldError('channel')"
                  class="pline-err"
                >
                  {{ fieldError('channel') }}
                </p>
              </div>
              <div class="field">
                <label for="of-partner">{{ t('offers.partner') }}</label>
                <input
                  id="of-partner"
                  v-model="form.partner"
                  :placeholder="t('offers.partnerPlaceholder')"
                >
                <p
                  v-if="fieldError('partner')"
                  class="pline-err"
                >
                  {{ fieldError('partner') }}
                </p>
              </div>
            </div>
            <div class="field">
              <span class="field-label">{{ t('offers.cabinTypes') }}</span>
              <div class="chkgrid">
                <label
                  v-for="cabin in OFFER_CABIN_TYPES"
                  :key="cabin"
                  class="chkline"
                >
                  <input
                    type="checkbox"
                    :checked="form.cabin_types.includes(cabin)"
                    @change="toggleCabin(cabin, ($event.target as HTMLInputElement).checked)"
                  >
                  {{ cabin === 'SUITE' ? t('offers.cabinSuite') : t('offers.cabinOwner') }}
                </label>
              </div>
              <p
                v-if="fieldError('cabin_types')"
                class="pline-err"
              >
                {{ fieldError('cabin_types') }}
              </p>
            </div>
            <div class="field">
              <span class="field-label">{{ t('offers.itineraries') }}</span>
              <div class="chkgrid">
                <label
                  v-for="item in itineraries"
                  :key="item.code"
                  class="chkline"
                >
                  <input
                    type="checkbox"
                    :checked="form.itinerary_codes.includes(item.code)"
                    :disabled="item.festive || !canEdit"
                    @change="toggleItinerary(item.code, ($event.target as HTMLInputElement).checked)"
                  >
                  {{ item.name }}{{ item.festive ? t('offers.festiveNever') : '' }}
                </label>
              </div>
              <p
                v-if="fieldError('itinerary_codes')"
                class="pline-err"
              >
                {{ fieldError('itinerary_codes') }}
              </p>
            </div>
            <div class="cols2">
              <div class="field">
                <label for="of-bf">{{ t('offers.bookingFrom') }}</label>
                <input
                  id="of-bf"
                  v-model="form.booking_from"
                  type="date"
                >
                <p
                  v-if="fieldError('booking_from')"
                  class="pline-err"
                >
                  {{ fieldError('booking_from') }}
                </p>
              </div>
              <div class="field">
                <label for="of-bt">{{ t('offers.bookingTo') }}</label>
                <input
                  id="of-bt"
                  v-model="form.booking_to"
                  type="date"
                >
                <p
                  v-if="fieldError('booking_to')"
                  class="pline-err"
                >
                  {{ fieldError('booking_to') }}
                </p>
              </div>
            </div>
            <div class="cols2">
              <div class="field">
                <label for="of-tf">{{ t('offers.travelFrom') }}</label>
                <input
                  id="of-tf"
                  v-model="form.travel_from"
                  type="date"
                >
                <p
                  v-if="fieldError('travel_from')"
                  class="pline-err"
                >
                  {{ fieldError('travel_from') }}
                </p>
              </div>
              <div class="field">
                <label for="of-tt">{{ t('offers.travelTo') }}</label>
                <input
                  id="of-tt"
                  v-model="form.travel_to"
                  type="date"
                >
                <p
                  v-if="fieldError('travel_to')"
                  class="pline-err"
                >
                  {{ fieldError('travel_to') }}
                </p>
              </div>
            </div>
            <label class="chkline">
              <input
                v-model="form.combinable"
                type="checkbox"
              >
              {{ t('offers.combinable') }}
            </label>
            <label class="chkline">
              <input
                v-model="form.is_promo_code"
                type="checkbox"
              >
              {{ t('offers.promoCode') }}
            </label>
            <p class="notice">
              {{ t('offers.appliesNotice') }}
            </p>
          </div>

          <div class="sec">
            <h4>{{ t('offers.sectionEngine') }}</h4>
            <div class="cols2">
              <div class="field">
                <label for="of-badge">{{ t('offers.badge') }}</label>
                <input
                  id="of-badge"
                  v-model="form.badge"
                  maxlength="18"
                  :placeholder="t('offers.badgePlaceholder')"
                >
                <p
                  v-if="fieldError('badge')"
                  class="pline-err"
                >
                  {{ fieldError('badge') }}
                </p>
              </div>
              <div class="field">
                <label for="of-pl">{{ t('offers.priceLine') }}</label>
                <input
                  id="of-pl"
                  v-model="form.price_line"
                  :placeholder="t('offers.priceLinePlaceholder')"
                >
                <p
                  v-if="fieldError('price_line')"
                  class="pline-err"
                >
                  {{ fieldError('price_line') }}
                </p>
              </div>
            </div>
            <div class="chkgrid">
              <label class="chkline">
                <input
                  v-model="form.show_on_card"
                  type="checkbox"
                >
                {{ t('offers.showOnCard') }}
              </label>
              <label class="chkline">
                <input
                  v-model="form.show_on_departures"
                  type="checkbox"
                >
                {{ t('offers.showOnDepartures') }}
              </label>
            </div>
            <div class="field">
              <label for="of-terms">{{ t('offers.terms') }}</label>
              <textarea
                id="of-terms"
                v-model="form.terms"
                rows="3"
              />
              <p
                v-if="fieldError('terms')"
                class="pline-err"
              >
                {{ fieldError('terms') }}
              </p>
            </div>
            <div class="prevbox">
              <div class="mono prevl">
                {{ t('offers.previewLabel') }}
              </div>
              <p
                v-if="form.channel === 'B2B'"
                class="note"
              >
                {{ t('offers.previewB2b') }}
              </p>
              <p
                v-else-if="form.is_promo_code"
                class="note"
              >
                {{ t('offers.previewPromo') }}
              </p>
              <template v-else>
                <div
                  v-if="form.show_on_departures && form.badge !== ''"
                  class="pdrow"
                >
                  <span class="badge-offer">{{ form.badge }}</span>
                </div>
                <div
                  v-if="form.price_line !== ''"
                  class="pline off"
                >
                  {{ form.price_line }}
                </div>
                <p
                  v-if="form.terms !== ''"
                  class="note"
                >
                  {{ form.terms }}
                </p>
              </template>
            </div>
            <p
              v-if="priceAffecting"
              class="notice"
            >
              {{ t('offers.priceAffectingNotice') }}
            </p>
          </div>
        </fieldset>

        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>
      </template>

      <template v-else>
        <HistoryTimeline :entries="history" />
        <UButton
          v-if="historyPage < historyLast"
          variant="outline"
          :loading="historyLoading"
          @click="historyPage += 1; loadHistory(false)"
        >
          {{ t('history.loadOlder') }}
        </UButton>
      </template>
    </template>

    <template #footer>
      <div class="transbtns">
        <template v-if="canEdit && tab === 'offer'">
          <UButton
            :loading="saving"
            @click="save(false)"
          >
            {{ priceAffecting ? t('offers.submit') : t('offers.save') }}
          </UButton>
          <UButton
            v-if="isNew || storedStatus === 'DRAFT' || storedStatus === 'PENDING'"
            variant="outline"
            :loading="saving"
            @click="save(true)"
          >
            {{ t('offers.saveDraft') }}
          </UButton>
          <UButton
            v-if="storedStatus === 'LIVE'"
            variant="outline"
            :loading="saving"
            @click="pauseOrResume('pause')"
          >
            {{ t('offers.pause') }}
          </UButton>
          <UButton
            v-if="storedStatus === 'PAUSED'"
            variant="outline"
            :loading="saving"
            @click="pauseOrResume('resume')"
          >
            {{ t('offers.resume') }}
          </UButton>
        </template>
        <template v-if="canApprove && storedStatus === 'PENDING' && tab === 'offer'">
          <UButton
            :loading="saving"
            @click="startReason('approve')"
          >
            {{ t('offers.approve') }}
          </UButton>
          <UButton
            variant="outline"
            :loading="saving"
            @click="startReason('reject')"
          >
            {{ t('offers.reject') }}
          </UButton>
        </template>
        <UButton
          variant="outline"
          @click="onUpdateOpen(false)"
        >
          {{ t('offers.close') }}
        </UButton>
      </div>
    </template>
  </USlideover>

  <ReasonModal
    v-model:open="reasonOpen"
    :title="reasonKind === 'approve' ? t('offers.approveTitle') : t('offers.rejectTitle')"
    hint="required"
    :submitting="reasonSubmitting"
    :error="reasonError"
    @submit="submitReason"
  />
</template>
