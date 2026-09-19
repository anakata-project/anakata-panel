<script setup lang="ts">
import { RATES_DRAFT_KEY } from './rateHelpers'

defineProps<{
  canPublish: boolean
  errorsFor: (path: string) => Array<string>
}>()

const injected = inject(RATES_DRAFT_KEY)

if (injected === undefined) {
  throw new Error('RatesTermsPanel requires a provided rates draft')
}

const draft = computed(() => {
  const value = injected.value

  if (value === null) {
    throw new Error('RatesTermsPanel requires a rates draft')
  }

  return value
})

const { t } = useI18n()
</script>

<template>
  <AnkPanel :title="t('rates.termsTitle')">
    <template #actions>
      <AnkPill>{{ t('rates.adminDirector') }}</AnkPill>
    </template>

    <div class="rates-scroll">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('rates.bookingType') }}</th>
            <th>{{ t('rates.deposit') }}</th>
            <th>{{ t('rates.depositDue') }}</th>
            <th>{{ t('rates.balanceDue') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{{ t('rates.cabinType') }}</td>
            <td>
              <div class="rcell">
                <ConfigNumberInput
                  v-model="draft.terms.cabin_deposit_pct"
                  data-r="terms.cabin_deposit_pct"
                  :disabled="!canPublish"
                  :bad="errorsFor('terms.cabin_deposit_pct').length > 0"
                  min="0"
                  max="100"
                  step="1"
                />
                <span class="mono">%</span>
              </div>
            </td>
            <td>{{ t('rates.cabinDepositDue') }}</td>
            <td>
              <div class="rcell">
                <span class="mono">T−</span>
                <ConfigNumberInput
                  v-model="draft.terms.cabin_balance_days"
                  data-r="terms.cabin_balance_days"
                  :disabled="!canPublish"
                  :bad="errorsFor('terms.cabin_balance_days').length > 0"
                  min="1"
                  max="365"
                  step="1"
                />
                <span class="mono">{{ t('rates.days') }}</span>
              </div>
            </td>
          </tr>
          <tr>
            <td>{{ t('rates.charterType') }}</td>
            <td>
              <div class="rcell">
                <ConfigNumberInput
                  v-model="draft.terms.charter_deposit_pct"
                  data-r="terms.charter_deposit_pct"
                  :disabled="!canPublish"
                  :bad="errorsFor('terms.charter_deposit_pct').length > 0"
                  min="0"
                  max="100"
                  step="1"
                />
                <span class="mono">%</span>
              </div>
            </td>
            <td>
              <div class="rcell">
                <ConfigNumberInput
                  v-model="draft.terms.charter_deposit_business_days"
                  data-r="terms.charter_deposit_business_days"
                  :disabled="!canPublish"
                  :bad="errorsFor('terms.charter_deposit_business_days').length > 0"
                  min="1"
                  max="30"
                  step="1"
                />
                <span class="mono">{{ t('rates.businessDays') }}</span>
              </div>
            </td>
            <td>
              <div class="rcell">
                <span class="mono">T−</span>
                <ConfigNumberInput
                  v-model="draft.terms.charter_balance_days"
                  data-r="terms.charter_balance_days"
                  :disabled="!canPublish"
                  :bad="errorsFor('terms.charter_balance_days').length > 0"
                  min="1"
                  max="365"
                  step="1"
                />
                <span class="mono">{{ t('rates.days') }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AnkPanel>
</template>
