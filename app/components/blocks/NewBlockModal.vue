<script setup lang="ts">
import type { BlockReason, DepartureListItem, InternalBlock, Paginated, Yacht } from '../../types/api'
import { applyApiFormError } from '../../utils/apiForm'
import {
  applyFullYacht,
  BLOCK_REASONS,
  cabinCodesPayload,
  departureOptionLabel,
  futureDepartures,
  isFullYacht,
  MAX_DEPARTURES,
  reasonLabelKey,
  toggleCabin,
  type StoreInternalBlockBody
} from './blockHelpers'

const props = defineProps<{
  open: boolean
  yachts: Array<Yacht>
  from: string | null
  to: string | null
  today: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'created': [block: InternalBlock]
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const toast = useToast()

const yachtId = ref<number | null>(null)
const selectedDepartureIds = ref<Array<number>>([])
const selectedCabins = ref<Array<string>>([])
const reason = ref<BlockReason>('FAM_TRIP')
const notes = ref('')
const departures = ref<Array<DepartureListItem>>([])
const loadingDepartures = ref(false)
const submitting = ref(false)
const conflict = ref('')
const fieldErrors = ref<Record<string, string>>({})

const selectedYacht = computed(() => props.yachts.find(yacht => yacht.id === yachtId.value) ?? null)

const cabins = computed(() => {
  return [...(selectedYacht.value?.cabins ?? [])].sort((left, right) => left.sort - right.sort)
})

const fullYacht = computed({
  get: () => isFullYacht(selectedCabins.value),
  set: (checked: boolean) => {
    selectedCabins.value = applyFullYacht(checked)
  }
})

const atDepartureCap = computed(() => selectedDepartureIds.value.length >= MAX_DEPARTURES)

function reset(): void {
  yachtId.value = props.yachts[0]?.id ?? null
  selectedDepartureIds.value = []
  selectedCabins.value = []
  reason.value = 'FAM_TRIP'
  notes.value = ''
  departures.value = []
  conflict.value = ''
  fieldErrors.value = {}
}

async function loadDepartures(): Promise<void> {
  if (yachtId.value === null) {
    departures.value = []
    return
  }

  loadingDepartures.value = true

  try {
    const params = new URLSearchParams({
      per_page: '500',
      yacht_id: String(yachtId.value)
    })

    if (props.from !== null) {
      params.set('from', props.from)
    }

    if (props.to !== null) {
      params.set('to', props.to)
    }

    const result = await request(`/api/rms/departures?${params.toString()}`) as Paginated<DepartureListItem>
    departures.value = futureDepartures(result.data, props.today)
  } finally {
    loadingDepartures.value = false
  }
}

watch(() => props.open, (isOpen) => {
  if (isOpen) {
    reset()
    void loadDepartures()
  }
})

function onYachtChange(id: number): void {
  if (yachtId.value === id) {
    return
  }

  yachtId.value = id
  selectedDepartureIds.value = []
  void loadDepartures()
}

function isDepartureChecked(id: number): boolean {
  return selectedDepartureIds.value.includes(id)
}

function toggleDeparture(id: number, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  if (target.checked) {
    if (selectedDepartureIds.value.length >= MAX_DEPARTURES) {
      target.checked = false
      return
    }

    selectedDepartureIds.value = [...selectedDepartureIds.value, id]
    return
  }

  selectedDepartureIds.value = selectedDepartureIds.value.filter(item => item !== id)
}

function onCabinToggle(code: string, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  selectedCabins.value = toggleCabin(selectedCabins.value, code)

  if (target.checked !== selectedCabins.value.includes(code)) {
    target.checked = selectedCabins.value.includes(code)
  }
}

function optionLabel(row: DepartureListItem): string {
  return departureOptionLabel(format(row.date, 'short'), row.itinerary.name)
}

async function submit(): Promise<void> {
  conflict.value = ''
  fieldErrors.value = {}

  if (selectedDepartureIds.value.length === 0) {
    conflict.value = t('blocks.needDepartures')
    return
  }

  if (selectedCabins.value.length === 0) {
    conflict.value = t('blocks.needCabins')
    return
  }

  submitting.value = true

  try {
    const cabinCodes = cabinCodesPayload(selectedCabins.value)
    const body: StoreInternalBlockBody = {
      reason: reason.value,
      notes: notes.value === '' ? null : notes.value,
      departures: selectedDepartureIds.value.map(id => ({
        departure_id: id,
        cabin_codes: cabinCodes
      }))
    }

    const created = await request('/api/rms/blocks', {
      method: 'POST',
      body
    }) as InternalBlock

    toast.add({
      title: t('blocks.createdToast', {
        reference: created.reference,
        n: String(created.claims.length)
      })
    })
    emit('created', created)
    emit('update:open', false)
  } catch (error: unknown) {
    if (!applyApiFormError(error, (fields, message) => {
      fieldErrors.value = fields
      conflict.value = message
    })) {
      throw error
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('blocks.createTitle')"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <div
          v-if="conflict"
          class="warnbox"
        >
          {{ conflict }}
        </div>
        <p class="notice">
          {{ t('blocks.notice') }}
        </p>

        <div class="field">
          <label>{{ t('blocks.yacht') }}</label>
          <div class="blk-radios">
            <label
              v-for="yacht in yachts"
              :key="yacht.id"
              class="chkline"
            >
              <input
                type="radio"
                :value="yacht.id"
                :checked="yachtId === yacht.id"
                @change="onYachtChange(yacht.id)"
              >
              {{ yacht.code }}
            </label>
          </div>
        </div>

        <div class="field">
          <label>{{ t('blocks.departures') }}</label>
          <p class="field-hint">
            {{ t('blocks.departuresHint') }}
          </p>
          <p
            v-if="loadingDepartures"
            class="blk-meta"
          >
            …
          </p>
          <p
            v-else-if="departures.length === 0"
            class="blk-meta"
          >
            {{ t('blocks.noDepartures') }}
          </p>
          <div
            v-else
            class="blk-dep-list"
          >
            <label
              v-for="row in departures"
              :key="row.id"
              class="chkline"
            >
              <input
                type="checkbox"
                :checked="isDepartureChecked(row.id)"
                :disabled="!isDepartureChecked(row.id) && atDepartureCap"
                @change="toggleDeparture(row.id, $event)"
              >
              <span>{{ optionLabel(row) }}</span>
              <span class="blk-dep-free">{{ t('blocks.freeCabins', { n: String(row.availability.counts.free) }) }}</span>
            </label>
          </div>
        </div>

        <div class="field">
          <label>{{ t('blocks.cabins') }}</label>
          <label class="chkline">
            <input
              v-model="fullYacht"
              type="checkbox"
            >
            {{ t('blocks.fullYacht') }}
          </label>
          <div class="blk-cabins">
            <label
              v-for="cabin in cabins"
              :key="cabin.code"
              class="chkline"
            >
              <input
                type="checkbox"
                :checked="selectedCabins.includes(cabin.code)"
                @change="onCabinToggle(cabin.code, $event)"
              >
              {{ cabin.label }}
            </label>
          </div>
        </div>

        <div class="field">
          <label>{{ t('blocks.reason') }}</label>
          <select
            v-model="reason"
            :class="{ bad: fieldErrors.reason }"
          >
            <option
              v-for="item in BLOCK_REASONS"
              :key="item"
              :value="item"
            >
              {{ t(reasonLabelKey(item)) }}
            </option>
          </select>
        </div>

        <div class="field">
          <label>
            {{ t('blocks.notes') }}
            <span class="cnt">· {{ t('blocks.notesCounter', { n: String(notes.length) }) }}</span>
          </label>
          <textarea
            v-model="notes"
            maxlength="500"
            rows="3"
          />
        </div>

        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="emit('update:open', false)"
          >
            {{ t('blocks.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ t('blocks.create') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
