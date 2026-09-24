<script setup lang="ts">
import type {
  Departure,
  DepartureMutationResponse,
  Itinerary,
  Yacht
} from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { confirmUnsaved } from '../../composables/useUnsavedGuard'
import {
  adoptCreated,
  afterMutation,
  cabinChipClass,
  cabinChipLabel,
  dateAndYachtLockCount,
  DEPARTURE_STATUSES,
  draftFromDeparture,
  draftFromNew,
  editorSnapshot,
  labelToneClass,
  sortedItineraries,
  statusLabelKey,
  toApiBody,
  type DepartureDraft
} from './departureHelpers'

const isOpen = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  sourceId: number | null
  yachts: Array<Yacht>
  itineraries: Array<Itinerary>
  canManage: boolean
  roleName: string
  festiveSupplementPp: number
}>()

const emit = defineEmits<{
  saved: [departure: Departure]
  deleted: []
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const draft = ref<DepartureDraft | null>(null)
const detail = ref<Departure | null>(null)
const snapshot = ref('')
const warn = ref('')
const apiWarnings = ref<Array<string>>([])
const saving = ref(false)
const historyOpen = ref(false)

const dirty = computed(() => {
  return draft.value !== null && editorSnapshot(draft.value) !== snapshot.value
})

const isNew = computed(() => draft.value?.id === null)

const itineraries = computed(() => sortedItineraries(props.itineraries))

const festiveAmount = computed(() => money(props.festiveSupplementPp))

const yachtItems = computed(() => props.yachts.map(yacht => ({
  label: yacht.name,
  value: yacht.id
})))

const statusItems = computed(() => DEPARTURE_STATUSES.map(status => ({
  label: t(statusLabelKey(status)),
  value: status
})))

const title = computed(() => {
  if (draft.value === null || isNew.value) {
    return t('departures.newTitle')
  }

  const yacht = props.yachts.find(item => item.id === draft.value?.yacht_id)

  return t('departures.existingTitle', {
    date: format(draft.value.date, 'short'),
    yacht: yacht?.name ?? ''
  })
})

const bid = computed(() => {
  if (draft.value === null || isNew.value) {
    return t('departures.newBid')
  }

  const itinerary = props.itineraries.find(item => item.id === draft.value?.itinerary_id)

  return t('departures.existingBid', {
    reference: draft.value.reference,
    itinerary: itinerary?.name ?? ''
  })
})

const historyUrl = computed(() => {
  return draft.value?.id ? `/api/rms/departures/${draft.value.id}/history` : null
})

const dateLocked = computed(() => detail.value?.locks.date_and_yacht === true)

const deleteLocked = computed(() => detail.value?.locks.delete === true)

const lockNotice = computed(() => {
  if (!dateLocked.value || detail.value === null) {
    return ''
  }

  return t('departures.lockNotice', {
    n: String(dateAndYachtLockCount(detail.value.availability.counts))
  })
})

const deleteLabel = computed(() => {
  const reason = detail.value?.locks.reason

  if (deleteLocked.value && reason) {
    return t('departures.deleteLocked', { reason })
  }

  return t('departures.delete')
})

async function resetFrom(sourceId: number | null): Promise<void> {
  warn.value = ''
  apiWarnings.value = []
  historyOpen.value = false

  if (sourceId === null) {
    draft.value = draftFromNew(props.yachts, props.itineraries)
    detail.value = null
    snapshot.value = draft.value ? editorSnapshot(draft.value) : ''
    return
  }

  const body = await request(`/api/rms/departures/${sourceId}`) as Departure
  detail.value = body
  draft.value = draftFromDeparture(body)
  snapshot.value = editorSnapshot(draft.value)
}

watch(
  isOpen,
  (open) => {
    if (open) {
      void resetFrom(props.sourceId).catch(showError)
    }
  }
)

function showError(error: unknown): void {
  warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
}

function onThreshold(value: number | null): void {
  if (draft.value === null) {
    return
  }

  draft.value.urgency_threshold = value ?? 0
}

function itineraryLabel(itinerary: Itinerary): string {
  if (itinerary.status === 'PUBLISHED') {
    return itinerary.name
  }

  return t('departures.itineraryDraft', { name: itinerary.name })
}

const itineraryItems = computed(() => itineraries.value.map(itinerary => ({
  label: itineraryLabel(itinerary),
  value: itinerary.id
})))

function onEmbarkDate(value: string | null): void {
  if (draft.value === null) {
    return
  }

  draft.value.date = value ?? ''
}

async function save(): Promise<void> {
  if (draft.value === null) {
    return
  }

  if (draft.value.date === '') {
    warn.value = t('departures.pickDate')
    return
  }

  saving.value = true
  warn.value = ''

  const wasNew = draft.value.id === null

  try {
    const response = await request(
      wasNew ? '/api/rms/departures' : `/api/rms/departures/${draft.value.id}`,
      {
        method: wasNew ? 'POST' : 'PATCH',
        body: toApiBody(draft.value)
      }
    ) as DepartureMutationResponse

    const outcome = afterMutation(wasNew, response.warnings)
    toast.add({
      title: wasNew ? t('departures.created') : t('departures.saved')
    })
    emit('saved', response)

    if (outcome.adoptCreated) {
      draft.value = adoptCreated(draft.value, response)
    }

    if (!outcome.closeDrawer) {
      detail.value = response
      snapshot.value = editorSnapshot(draft.value)
      apiWarnings.value = response.warnings
      return
    }

    isOpen.value = false
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

async function remove(): Promise<void> {
  if (draft.value?.id === null || draft.value === null) {
    return
  }

  if (!confirm(t('departures.deleteConfirm', { reference: draft.value.reference }))) {
    return
  }

  saving.value = true
  warn.value = ''

  try {
    await request(`/api/rms/departures/${draft.value.id}`, { method: 'DELETE' })
    toast.add({ title: t('departures.deleted') })
    isOpen.value = false
    emit('deleted')
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

function onUpdateOpen(value: boolean): void {
  if (!value && dirty.value && !confirmUnsaved(t('config.leaveUnsaved'))) {
    return
  }

  isOpen.value = value
}

useUnsavedGuard(dirty, () => t('config.leaveUnsaved'))
</script>

<template>
  <USlideover
    :open="isOpen"
    class="history-drawer"
    @update:open="onUpdateOpen"
  >
    <template #header>
      <div class="dep-header">
        <div>
          <h2>{{ title }}</h2>
          <div class="bid">
            {{ bid }}
          </div>
        </div>
        <UButton
          v-if="draft?.id && canManage"
          variant="outline"
          @click="historyOpen = true"
        >
          {{ t('departures.history') }}
        </UButton>
      </div>
    </template>

    <template #body>
      <p
        v-if="!canManage"
        class="notice"
      >
        {{ t('departures.viewOnly', { role: roleName }) }}
      </p>

      <fieldset
        v-if="draft"
        class="edfs"
        :disabled="!canManage"
      >
        <div class="sec">
          <h4>{{ t('departures.sectionDeparture') }}</h4>
          <div class="cols2">
            <div class="field">
              <label for="dep-embark-date">{{ t('departures.embarkDate') }}</label>
              <AnkDateInput
                id="dep-embark-date"
                :model-value="draft.date === '' ? null : draft.date"
                :disabled="!canManage || dateLocked"
                @update:model-value="onEmbarkDate"
              />
            </div>
            <div class="field">
              <label for="dep-yacht">{{ t('departures.yacht') }}</label>
              <USelect
                id="dep-yacht"
                v-model="draft.yacht_id"
                :items="yachtItems"
                :disabled="!canManage || dateLocked"
                class="w-full"
              />
            </div>
          </div>
          <p
            v-if="lockNotice"
            class="notice"
          >
            {{ lockNotice }}
          </p>
          <div class="cols2">
            <div class="field">
              <label for="dep-itinerary">{{ t('departures.itinerary') }}</label>
              <USelect
                id="dep-itinerary"
                v-model="draft.itinerary_id"
                :items="itineraryItems"
                :disabled="!canManage"
                class="w-full"
              />
            </div>
            <div class="field">
              <label for="dep-status">{{ t('departures.statusOnEngine') }}</label>
              <USelect
                id="dep-status"
                v-model="draft.status"
                :items="statusItems"
                :disabled="!canManage"
                class="w-full"
              />
            </div>
          </div>
          <label class="chkline">
            <input
              v-model="draft.festive"
              type="checkbox"
            >
            {{ t('departures.festiveCheck', { amount: festiveAmount }) }}
          </label>
        </div>

        <div class="sec">
          <h4>{{ t('departures.sectionGuest') }}</h4>
          <div class="cols2">
            <div class="field">
              <label for="dep-urgency">{{ t('departures.urgency') }}</label>
              <ConfigNumberInput
                id="dep-urgency"
                :model-value="draft.urgency_threshold"
                variant="field"
                :min="0"
                :max="9"
                @update:model-value="onThreshold"
              />
            </div>
            <div class="field">
              <label for="dep-public-note">{{ t('departures.publicNote') }}</label>
              <input
                id="dep-public-note"
                v-model="draft.public_note"
                maxlength="40"
                :placeholder="t('departures.publicNotePlaceholder')"
              >
            </div>
          </div>
          <label class="chkline">
            <input
              v-model="draft.waitlist_enabled"
              type="checkbox"
            >
            {{ t('departures.waitlist') }}
          </label>

          <div
            v-if="detail"
            class="prevbox"
          >
            <div class="mono prevl">
              {{ t('departures.previewLabel') }}
            </div>
            <div class="pdrow">
              <span>{{ format(detail.date, 'short') }} → {{ format(detail.return_date, 'short') }}</span>
              <span>{{ detail.yacht.name }}</span>
              <span
                class="pill"
                :class="labelToneClass(detail.availability.engine_label.tone)"
              >{{ detail.availability.engine_label.text }}</span>
              <span>
                {{ detail.rates.suite_from === null
                  ? t('departures.previewNoRate')
                  : t('departures.previewFrom', { amount: money(detail.rates.suite_from) }) }}{{ detail.festive ? t('departures.previewFestive') : '' }}
              </span>
              <span
                v-if="detail.public_note"
                class="dep-note-badge"
              >{{ detail.public_note }}</span>
            </div>
          </div>
        </div>
      </fieldset>

      <div
        v-if="detail"
        class="sec"
      >
        <h4>{{ t('departures.sectionInventory') }}</h4>
        <div class="cabchips">
          <span
            v-for="row in detail.availability.cabins"
            :key="row.cabin.code"
            class="cabchip"
            :class="cabinChipClass(row.state)"
          >
            {{ t('departures.cabinChip', { cabin: cabinChipLabel(row.cabin), state: row.state }) }}
          </span>
        </div>
        <p class="note dep-inventory-note">
          {{ t('departures.inventoryNote', {
            suites: String(detail.availability.counts.suites_free),
            owner: detail.availability.counts.owner_free ? t('departures.ownerFree') : t('departures.ownerTaken')
          }) }}
        </p>
      </div>

      <div
        v-if="warn || apiWarnings.length > 0"
        class="warnbox dep-warn"
      >
        <p v-if="warn">
          {{ warn }}
        </p>
        <p
          v-for="(message, index) in apiWarnings"
          :key="index"
        >
          {{ message }}
        </p>
      </div>

      <div class="transbtns">
        <template v-if="canManage">
          <UButton
            :disabled="saving"
            @click="save"
          >
            {{ isNew ? t('departures.create') : t('departures.save') }}
          </UButton>
          <UButton
            v-if="!isNew"
            variant="outline"
            :disabled="saving || deleteLocked"
            @click="remove"
          >
            {{ deleteLabel }}
          </UButton>
        </template>
        <UButton
          variant="outline"
          @click="onUpdateOpen(false)"
        >
          {{ t('departures.cancel') }}
        </UButton>
      </div>
    </template>
  </USlideover>

  <HistoryDrawer
    v-model:open="historyOpen"
    :title="draft?.reference ?? ''"
    :subject-type="t('departures.subject')"
    :url="historyUrl"
  />
</template>
