<script setup lang="ts">
import type { EngineSettingsVersion, ExtrasCatalogue, PriceCheckRow } from '../../../types/api'
import type { ConfigValueFormat } from '../../../utils/formatConfigValue'
import { rateFieldLabels, RATES_DRAFT_KEY, type RatesDraft } from '../../../components/rates/rateHelpers'
import {
  EXTRAS_DRAFT_KEY,
  extrasFieldLabels,
  extrasFormats,
  publishedCodes,
  type ExtrasDraft
} from '../../../components/extras/extrasCatalogueHelpers'
import { cloneDocument } from '../../../utils/documentsEqual'

const { can } = useAuth()
const { t } = useI18n()
const { request, useFetch } = useApi()

const editor = useConfigEditor('rates')
const extrasEditor = useConfigEditor('extras')
const canPublish = computed(() => can('rates.manage'))
const canPublishExtras = computed(() => can('extras.manage'))
const draft = computed(() => editor.draft as RatesDraft | null)
const extrasDraft = computed(() => extrasEditor.draft as ExtrasDraft | null)

provide(RATES_DRAFT_KEY, draft)
provide(EXTRAS_DRAFT_KEY, extrasDraft)

useUnsavedGuard(() => editor.dirty || extrasEditor.dirty, () => t('config.leaveUnsaved'))

const extrasLabels = computed(() => {
  return extrasDraft.value ? extrasFieldLabels(extrasDraft.value) : {}
})

const extrasValueFormats = computed(() => {
  return extrasDraft.value ? extrasFormats(extrasDraft.value) : {}
})

const extrasPublishedCodes = computed(() => {
  const document = extrasEditor.current?.document as ExtrasCatalogue | undefined

  return document === undefined ? new Set<string>() : publishedCodes(document)
})

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

    <template v-if="extrasDraft">
      <ConfigPublishBar
        :editor="extrasEditor"
        :can-publish="canPublishExtras"
        :approval-required="true"
        :read-only-text="t('rates.extrasViewOnly')"
        :confirm-note="t('rates.confirmExtras')"
        :formats="extrasValueFormats"
        :labels="extrasLabels"
      />

      <ExtrasCataloguePanel
        :can-publish="canPublishExtras"
        :published-codes="extrasPublishedCodes"
        :errors-for="extrasEditor.errorsFor"
      />

      <ConfigHistoryPanel
        :title="t('rates.extrasHistoryTitle')"
        :empty-text="t('rates.extrasHistoryEmpty')"
        :versions="extrasEditor.versions"
        :has-more="extrasEditor.hasMore"
        :loading="extrasEditor.historyLoading"
        :formats="extrasValueFormats"
        @load-older="extrasEditor.loadOlder()"
      />
    </template>

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
