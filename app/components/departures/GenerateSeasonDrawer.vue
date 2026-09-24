<script setup lang="ts">
import type { GenerateSeasonResult, Yacht } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { seasonDefaults, type SeasonCreateStatus, type SeasonPattern } from './departureHelpers'

const isOpen = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  yachts: Array<Yacht>
  latestDate: string | null
  today: string
}>()

const emit = defineEmits<{
  generated: []
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const from = ref<string | null>(null)
const to = ref<string | null>(null)
const yachtIds = ref<Array<number>>([])
const pattern = ref<SeasonPattern>('ALT')
const festiveWindow = ref(true)
const status = ref<SeasonCreateStatus>('CLOSED')
const warn = ref('')
const saving = ref(false)

const patternItems = computed(() => [
  { label: t('departures.patternAlt'), value: 'ALT' as SeasonPattern },
  { label: t('departures.patternWest'), value: 'WEST' as SeasonPattern },
  { label: t('departures.patternNorth'), value: 'NORTH' as SeasonPattern }
])

const statusItems = computed(() => [
  { label: t('departures.seasonClosed'), value: 'CLOSED' as SeasonCreateStatus },
  { label: t('departures.seasonOnSale'), value: 'ON_SALE' as SeasonCreateStatus }
])

watch(isOpen, (open) => {
  if (!open) {
    return
  }

  const defaults = seasonDefaults(props.latestDate, props.today)
  from.value = defaults.from
  to.value = defaults.to
  yachtIds.value = props.yachts.map(yacht => yacht.id)
  pattern.value = 'ALT'
  festiveWindow.value = true
  status.value = 'CLOSED'
  warn.value = ''
})

function isChecked(id: number): boolean {
  return yachtIds.value.includes(id)
}

function toggleYacht(id: number, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  if (target.checked) {
    yachtIds.value = [...yachtIds.value, id]
    return
  }

  yachtIds.value = yachtIds.value.filter(item => item !== id)
}

async function generate(): Promise<void> {
  if (from.value === null || from.value === '' || to.value === null || to.value === '' || from.value > to.value) {
    warn.value = t('departures.seasonNeedRange')
    return
  }

  if (yachtIds.value.length === 0) {
    warn.value = t('departures.seasonNeedYacht')
    return
  }

  saving.value = true
  warn.value = ''

  try {
    const result = await request('/api/rms/departures/generate-season', {
      method: 'POST',
      body: {
        from: from.value,
        to: to.value,
        yacht_ids: yachtIds.value,
        pattern: pattern.value,
        festive_window: festiveWindow.value,
        status: status.value
      }
    }) as GenerateSeasonResult

    const created = status.value === 'CLOSED'
      ? t('departures.seasonCreatedClosed', { n: String(result.created.length) })
      : t('departures.seasonCreatedOnSale', { n: String(result.created.length) })

    toast.add({
      title: `${created} ${t('departures.seasonSkipped', { n: String(result.skipped.length) })}`
    })
    isOpen.value = false
    emit('generated')
  } catch (error) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : t('departures.seasonNeedRange'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover
    :open="isOpen"
    class="history-drawer"
    @update:open="isOpen = $event"
  >
    <template #header>
      <div>
        <h2>{{ t('departures.seasonTitle') }}</h2>
        <div class="bid">
          {{ t('departures.seasonBid') }}
        </div>
      </div>
    </template>

    <template #body>
      <fieldset class="edfs">
        <div class="cols2">
          <div class="field">
            <label>{{ t('departures.seasonFrom') }}</label>
            <AnkDateInput v-model="from" />
          </div>
          <div class="field">
            <label>{{ t('departures.seasonTo') }}</label>
            <AnkDateInput v-model="to" />
          </div>
        </div>
        <div class="field">
          <label>{{ t('departures.seasonYachts') }}</label>
          <div class="chkgrid">
            <label
              v-for="yacht in yachts"
              :key="yacht.id"
              class="chkline"
            >
              <input
                type="checkbox"
                :checked="isChecked(yacht.id)"
                @change="toggleYacht(yacht.id, $event)"
              >
              {{ yacht.code }}
            </label>
          </div>
        </div>
        <div class="field">
          <label>{{ t('departures.seasonPattern') }}</label>
          <USelect
            v-model="pattern"
            :items="patternItems"
            class="w-full"
          />
        </div>
        <label class="chkline">
          <input
            v-model="festiveWindow"
            type="checkbox"
          >
          {{ t('departures.seasonFestive') }}
        </label>
        <div class="field dep-create-as">
          <label>{{ t('departures.seasonCreateAs') }}</label>
          <USelect
            v-model="status"
            :items="statusItems"
            class="w-full"
          />
        </div>
      </fieldset>

      <p class="notice">
        {{ t('departures.seasonNotice') }}
      </p>

      <div
        v-if="warn"
        class="warnbox dep-warn"
      >
        {{ warn }}
      </div>

      <div class="transbtns">
        <UButton
          :disabled="saving"
          @click="generate"
        >
          {{ t('departures.seasonGenerate') }}
        </UButton>
        <UButton
          variant="outline"
          @click="isOpen = false"
        >
          {{ t('departures.cancel') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>
