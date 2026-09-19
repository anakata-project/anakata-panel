<script setup lang="ts">
import { RATES_DRAFT_KEY } from './rateHelpers'

defineProps<{
  canPublish: boolean
  childMinAge: number | null
  childMaxAge: number | null
  errorsFor: (path: string) => Array<string>
}>()

const injected = inject(RATES_DRAFT_KEY)

if (injected === undefined) {
  throw new Error('RatesRulesPanel requires a provided rates draft')
}

const draft = computed(() => {
  const value = injected.value

  if (value === null) {
    throw new Error('RatesRulesPanel requires a rates draft')
  }

  return value
})

const { t } = useI18n()
</script>

<template>
  <AnkPanel :title="t('rates.rulesTitle')">
    <template #actions>
      <AnkPill>{{ t('rates.adminDirector') }}</AnkPill>
    </template>

    <div class="rates-scroll">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('rates.rule') }}</th>
            <th>{{ t('rates.value') }}</th>
            <th>{{ t('rates.restrictions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ t('rates.single') }}</td>
            <td>
              <div class="rcell">
                <span class="mono">+</span>
                <ConfigNumberInput
                  v-model="draft.rules.single_supplement_pct"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.single_supplement_pct').length > 0"
                  min="0"
                  max="100"
                  step="1"
                />
                <span class="mono">{{ t('rates.pctPpdo') }}</span>
              </div>
            </td>
            <td>{{ t('rates.singleRestriction') }}</td>
          </tr>
          <tr>
            <td>{{ t('rates.triple') }}</td>
            <td>
              <div class="rcell">
                <span class="mono">−</span>
                <ConfigNumberInput
                  v-model="draft.rules.triple_discount_pct"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.triple_discount_pct').length > 0"
                  min="0"
                  max="100"
                  step="1"
                />
                <span class="mono">{{ t('rates.pctPpdoTimes3') }}</span>
              </div>
            </td>
            <td>{{ t('rates.tripleRestriction') }}</td>
          </tr>
          <tr>
            <td>
              {{ t('rates.childBefore', {
                min: childMinAge === null ? '—' : String(childMinAge),
                max: childMaxAge === null ? '—' : String(childMaxAge)
              }) }}<NuxtLink
                class="lnk"
                to="/rms/booking-engine/settings"
              >{{ t('rates.engineSettings') }}</NuxtLink>{{ t('rates.childAfter') }}
            </td>
            <td>
              <div class="rcell">
                <span class="mono">−</span>
                <ConfigNumberInput
                  v-model="draft.rules.child_discount_pct"
                  data-r="rules.child_discount_pct"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.child_discount_pct').length > 0"
                  min="0"
                  max="100"
                  step="1"
                />
                <span class="mono">{{ t('rates.pctPpdo') }}</span>
              </div>
              <div
                class="rcell"
                style="margin-top: 6px"
              >
                <ConfigNumberInput
                  v-model="draft.rules.child_discounts_per_adult"
                  data-r="rules.child_discounts_per_adult"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.child_discounts_per_adult').length > 0"
                  min="0"
                  max="3"
                  step="1"
                />
                <span class="mono">{{ t('rates.perAdult') }}</span>
                <ConfigNumberInput
                  v-model="draft.rules.child_discounts_per_cabin"
                  data-r="rules.child_discounts_per_cabin"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.child_discounts_per_cabin').length > 0"
                  min="0"
                  max="3"
                  step="1"
                />
                <span class="mono">{{ t('rates.perCabin') }}</span>
              </div>
            </td>
            <td>{{ t('rates.childRestriction') }}</td>
          </tr>
          <tr>
            <td>{{ t('rates.backToBack') }}</td>
            <td>
              <div class="rcell">
                <span class="mono">−</span>
                <ConfigNumberInput
                  v-model="draft.rules.back_to_back_pct"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.back_to_back_pct').length > 0"
                  min="0"
                  max="100"
                  step="1"
                />
                <span class="mono">{{ t('rates.pctBothWeeks') }}</span>
              </div>
            </td>
            <td>{{ t('rates.b2bRestriction') }}</td>
          </tr>
          <tr>
            <td>{{ t('rates.festive') }}</td>
            <td>
              <div class="rcell">
                <span class="mono">+USD</span>
                <ConfigNumberInput
                  v-model="draft.rules.festive_supplement_pp"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.festive_supplement_pp').length > 0"
                  min="0"
                  step="1"
                />
                <span class="mono">{{ t('rates.perGuest') }}</span>
              </div>
              <div
                class="rcell"
                style="margin-top: 6px"
              >
                <span class="mono">+USD</span>
                <ConfigNumberInput
                  v-model="draft.rules.festive_supplement_charter"
                  :disabled="!canPublish"
                  :bad="errorsFor('rules.festive_supplement_charter').length > 0"
                  min="0"
                  step="1"
                />
                <span class="mono">{{ t('rates.perCharter') }}</span>
              </div>
            </td>
            <td>{{ t('rates.festiveRestriction') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </AnkPanel>
</template>
