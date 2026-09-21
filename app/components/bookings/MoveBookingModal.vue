<script setup lang="ts">
import type { Booking, CabinAvailability, Departure, MovePreview, Paginated, PriceLine } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { ApiError } from '#imports'
import {
  departureOptionLabel,
  formatMoveDifference,
  galapagosTomorrowIso,
  hasModificationFee
} from './bookingHelpers'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  booking: Booking | null
}>()

const emit = defineEmits<{
  moved: [booking: Booking]
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const departures = ref<Array<Departure>>([])
const loadingDepartures = ref(false)
const departureId = ref<number | null>(null)
const cabinCode = ref<string | null>(null)
const preview = ref<MovePreview | null>(null)
const previewing = ref(false)
const submitting = ref(false)
const warn = ref('')

const isCharter = computed(() => props.booking?.type === 'CHARTER')

const selectedDeparture = computed(() => {
  return departures.value.find(item => item.id === departureId.value) ?? null
})

const cabins = computed<Array<CabinAvailability>>(() => {
  return selectedDeparture.value?.availability.cabins ?? []
})

const difference = computed(() => {
  if (preview.value === null) {
    return null
  }

  return formatMoveDifference(preview.value.difference, money)
})

function cabinEnabled(cabin: CabinAvailability): boolean {
  return cabin.state === 'FREE' || cabin.cabin.code === props.booking?.cabin?.code
}

async function loadDepartures(): Promise<void> {
  loadingDepartures.value = true
  warn.value = ''

  try {
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
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    loadingDepartures.value = false
  }
}

async function loadPreview(): Promise<void> {
  if (props.booking === null || departureId.value === null) {
    preview.value = null
    return
  }

  if (!isCharter.value && (cabinCode.value === null || cabinCode.value === '')) {
    preview.value = null
    return
  }

  previewing.value = true

  try {
    preview.value = await request(`/api/rms/bookings/${props.booking.id}/move/preview`, {
      method: 'POST',
      body: {
        departure_id: departureId.value,
        cabin_code: isCharter.value ? null : cabinCode.value
      }
    }) as MovePreview
  } catch (error: unknown) {
    preview.value = null
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    previewing.value = false
  }
}

watch(open, async (isOpen) => {
  if (!isOpen) {
    return
  }

  departureId.value = null
  cabinCode.value = props.booking?.cabin?.code ?? null
  preview.value = null
  warn.value = ''
  await loadDepartures()
})

watch([departureId, cabinCode], () => {
  warn.value = ''
  void loadPreview()
})

async function confirm(): Promise<void> {
  if (props.booking === null || departureId.value === null || preview.value === null) {
    return
  }

  submitting.value = true
  warn.value = ''

  try {
    const moved = await request(`/api/rms/bookings/${props.booking.id}/move`, {
      method: 'POST',
      body: {
        departure_id: departureId.value,
        cabin_code: isCharter.value ? null : cabinCode.value,
        confirm_total: preview.value.new_total
      }
    }) as Booking

    toast.add({ title: t('bookings.movedToast') })
    emit('moved', moved)
    open.value = false
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')

    if (error instanceof ApiError && error.status === 409) {
      await loadPreview()
    }
  } finally {
    submitting.value = false
  }
}

function shortDate(iso: string): string {
  return format(iso, 'short')
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('bookings.moveTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="confirm"
      >
        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>

        <div class="field">
          <label>{{ t('bookings.moveDeparture') }}</label>
          <select
            :value="departureId ?? ''"
            :disabled="loadingDepartures"
            @change="departureId = Number(($event.target as HTMLSelectElement).value) || null"
          >
            <option value="">
              {{ loadingDepartures ? t('bookings.previewing') : t('bookings.movePickDeparture') }}
            </option>
            <option
              v-for="item in departures"
              :key="item.id"
              :value="item.id"
            >
              {{ departureOptionLabel(item.date, item.yacht.name, item.itinerary.name, item.festive, shortDate) }}
            </option>
          </select>
          <p
            v-if="!loadingDepartures && departures.length === 0"
            class="field-hint"
          >
            {{ t('bookings.noFutureDepartures') }}
          </p>
        </div>

        <div
          v-if="!isCharter"
          class="field"
        >
          <label>{{ t('bookings.moveCabin') }}</label>
          <select
            :value="cabinCode ?? ''"
            :disabled="selectedDeparture === null"
            @change="cabinCode = ($event.target as HTMLSelectElement).value || null"
          >
            <option value="">
              {{ t('bookings.movePickCabin') }}
            </option>
            <option
              v-for="item in cabins"
              :key="item.cabin.code"
              :value="item.cabin.code"
              :disabled="!cabinEnabled(item)"
            >
              {{ item.cabin.label }}{{ cabinEnabled(item) ? '' : ` · ${t('bookings.moveUnavailable')}` }}
            </option>
          </select>
        </div>

        <p
          v-if="previewing"
          class="field-hint"
        >
          {{ t('bookings.previewing') }}
        </p>

        <template v-if="preview">
          <div class="kv">
            <span>{{ t('bookings.moveCurrent') }}</span>
            <span>{{ money(preview.current_total) }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.moveNew') }}</span>
            <span>{{ money(preview.new_total) }}</span>
          </div>
          <div class="kv">
            <span>{{ t('bookings.moveDifference') }}</span>
            <span
              v-if="difference"
              :class="{
                'move-diff-up': difference.tone === 'up',
                'move-diff-down': difference.tone === 'down',
                'move-diff-same': difference.tone === 'same'
              }"
            >{{ difference.text }}</span>
          </div>
          <div
            v-for="line in preview.new_price_lines as Array<PriceLine>"
            :key="line.code"
            class="pline"
          >
            <span>{{ line.label }}</span>
            <span>{{ money(line.amount) }}</span>
          </div>
          <p
            v-if="preview.sailing_year_changes"
            class="notice"
          >
            {{ t('bookings.sailingYearChanges') }}
          </p>
          <p
            v-if="preview.festive_changes"
            class="notice"
          >
            {{ t('bookings.festiveChanges') }}
          </p>
          <p
            v-for="item in preview.warnings"
            :key="item"
            class="notice"
          >
            {{ item }}
          </p>
          <p
            v-if="!hasModificationFee(preview.new_price_lines)"
            class="note"
          >
            {{ t('bookings.noModFee') }}
          </p>
        </template>

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
            :disabled="submitting || preview === null || !preview.available"
          >
            {{ t('bookings.moveConfirm') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
