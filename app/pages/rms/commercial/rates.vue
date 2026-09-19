<script setup lang="ts">
import type { EngineSettingsVersion, PriceCheckRow } from '../../../types/api'
import type { ConfigValueFormat } from '../../../utils/formatConfigValue'
import { rateFieldLabels, RATES_DRAFT_KEY, type RatesDraft } from '../../../components/rates/rateHelpers'
import { cloneDocument } from '../../../utils/documentsEqual'

const { can } = useAuth()
const { t } = useI18n()
const { request, useFetch } = useApi()

const editor = useConfigEditor('rates')
const canPublish = computed(() => can('rates.manage'))
const draft = computed(() => editor.draft as RatesDraft | null)

provide(RATES_DRAFT_KEY, draft)

useUnsavedGuard(() => editor.dirty, () => t('config.leaveUnsaved'))

const { data: engineSettings } = useFetch<EngineSettingsVersion>('/api/rms/engine-settings')

const childMinAge = computed(() => {
  return engineSettings.value?.document.guests.child_min_age ?? null
})

const childMaxAge = computed(() => {
  return engineSettings.value?.document.guests.child_max_age ?? null
})

const selectedYear = ref<number | null>(null)
const priceCheckRows = ref<Array<PriceCheckRow>>([])
const priceCheckStale = ref(false)
let priceCheckSeq = 0

const draftYears = computed(() => {
  return draft.value?.years.map(row => row.year) ?? []
})

const labels = computed(() => {
  return draft.value ? rateFieldLabels(draft.value) : {}
})

const formats: Record<string, ConfigValueFormat> = {
  'years': 'money',
  'rules.festive_supplement_pp': 'money',
  'rules.festive_supplement_charter': 'money'
}

watch(draftYears, (years) => {
  if (selectedYear.value === null || !years.includes(selectedYear.value)) {
    selectedYear.value = years[0] ?? null
  }
}, { immediate: true })

watch(
  () => [editor.loading, editor.validating, editor.hasErrors, selectedYear.value] as const,
  async ([loading, validating, hasErrors, year]) => {
    if (loading || validating || year === null || draft.value === null) {
      return
    }

    if (hasErrors) {
      priceCheckStale.value = true
      return
    }

    const id = ++priceCheckSeq
    const document = cloneDocument(toRaw(draft.value))

    try {
      const body = await request('/api/rms/rates/price-check', {
        method: 'POST',
        body: {
          year,
          document
        }
      }) as { scenarios: Array<PriceCheckRow> }

      if (id !== priceCheckSeq) {
        return
      }

      priceCheckRows.value = body.scenarios
      priceCheckStale.value = false
    } catch {
      if (id === priceCheckSeq) {
        priceCheckStale.value = true
      }
    }
  }
)
</script>

<template>
  <div v-if="draft">
    <p class="notice rates-notice">
      {{ t('rates.noticeBefore') }}<b>{{ t('rates.noticeEdit') }}</b>{{ t('rates.noticeAfter') }}
    </p>

    <ConfigPublishBar
      :editor="editor"
      :can-publish="canPublish"
      :approval-required="true"
      :read-only-text="t('rates.viewOnly')"
      :confirm-note="t('config.confirmRates')"
      :formats="formats"
      :labels="labels"
    />

    <RatesBasePanel
      :can-publish="canPublish"
      :errors-for="editor.errorsFor"
    />

    <RatesTermsPanel
      :can-publish="canPublish"
      :errors-for="editor.errorsFor"
    />

    <RatesRulesPanel
      :can-publish="canPublish"
      :child-min-age="childMinAge"
      :child-max-age="childMaxAge"
      :errors-for="editor.errorsFor"
    />

    <RatesPriceCheck
      :years="draftYears"
      :year="selectedYear"
      :rows="priceCheckRows"
      :stale="priceCheckStale"
      @update:year="selectedYear = $event"
    />

    <ConfigHistoryPanel
      :title="t('rates.historyTitle')"
      :empty-text="t('rates.historyEmpty')"
      :versions="editor.versions"
      :has-more="editor.hasMore"
      :loading="editor.historyLoading"
      :formats="formats"
      @load-older="editor.loadOlder()"
    />

    <AnkPanel :title="t('rates.extrasTitle')">
      <template #actions>
        <AnkPill>{{ t('rates.adminDirector') }}</AnkPill>
      </template>
      <p class="note">
        {{ t('rates.extrasNote') }}
      </p>
    </AnkPanel>

    <AnkPanel :title="t('rates.promotionsTitle')">
      <template #actions>
        <AnkPill tone="coral">
          {{ t('rates.promotionsPill') }}
        </AnkPill>
      </template>
      <p class="note">
        {{ t('rates.promotionsNote') }}
        <NuxtLink
          class="lnk"
          to="/rms/booking-engine/offers"
        >
          {{ t('rates.offersLink') }}
        </NuxtLink>
      </p>
    </AnkPanel>
  </div>
</template>
