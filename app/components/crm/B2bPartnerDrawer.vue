<script setup lang="ts">
import type { B2bPartnerRow, JourneyEnrolment } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import JourneyEnrolmentDetail from './JourneyEnrolmentDetail.vue'

type B2bPartnerDetail = Extract<B2bPartnerRow, { deals: ReadonlyArray<unknown> }>

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  agencyId: number | null
}>()

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format: money } = useMoney()

const detail = ref<B2bPartnerDetail | null>(null)
const error = ref('')
const loading = ref(false)
const canRms = computed(() => can('panel.rms'))
let requestToken = 0

function isFullEnrolment(enrolment: B2bPartnerDetail['enrolment']): enrolment is JourneyEnrolment {
  return enrolment !== null && 'sends' in enrolment
}

const fullEnrolment = computed(() => {
  if (detail.value === null || !isFullEnrolment(detail.value.enrolment)) {
    return null
  }

  return detail.value.enrolment
})

function contactHref(id: number): string {
  return `/crm/sales/contacts?open=${String(id)}`
}

function rmsHref(id: number): string {
  return `/rms/commercial/b2b?open=${String(id)}`
}

function bookingHref(reference: string): string {
  return `/rms/reservations/bookings?open=${encodeURIComponent(reference)}`
}

async function load(id: number): Promise<void> {
  const token = ++requestToken
  loading.value = true
  error.value = ''

  try {
    const result = await request(`/api/crm/b2b-partners/${String(id)}`) as B2bPartnerDetail

    if (token !== requestToken) {
      return
    }

    detail.value = result
  } catch (caught: unknown) {
    if (token !== requestToken) {
      return
    }

    detail.value = null
    error.value = firstApiMessage(caught) ?? t('crmB2b.failed')
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

watch([open, () => props.agencyId], ([isOpen, id]) => {
  if (!isOpen || id === null) {
    return
  }

  detail.value = null
  void load(id)
})
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="detail?.name ?? t('crmB2b.title')"
  >
    <template #body>
      <p
        v-if="error"
        class="warnbox"
      >
        {{ error }}
      </p>
      <p
        v-if="loading && detail === null"
        class="crm-held"
      >
        {{ t('crmB2b.title') }}
      </p>
      <template v-else-if="detail">
        <div class="kv">
          <span>{{ t('crmB2b.colStatus') }}</span>
          <span>
            <span class="pill">{{ detail.status }}</span>
          </span>
        </div>
        <div class="kv">
          <span>{{ t('crmB2b.reference') }}</span>
          <span>{{ detail.reference }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmB2b.colRate') }}</span>
          <span>{{ detail.commission_pct }}%</span>
        </div>
        <div class="kv">
          <span>{{ t('crmB2b.colRevenue') }}</span>
          <span>{{ money(detail.revenue) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmB2b.colCommission') }}</span>
          <span>{{ money(detail.commission_accrued) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmB2b.colDeals') }}</span>
          <span>{{ detail.open_deal_count }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmB2b.colContact') }}</span>
          <span>
            <NuxtLink
              v-if="detail.contact"
              :to="contactHref(detail.contact.id)"
            >
              {{ detail.contact.name }}
            </NuxtLink>
            <span
              v-else
              class="crm-held"
            >{{ detail.enrolment_note }}</span>
          </span>
        </div>
        <div
          v-if="canRms"
          class="kv"
        >
          <span>{{ t('crmB2b.openRms') }}</span>
          <span>
            <NuxtLink :to="rmsHref(detail.id)">
              {{ detail.reference }}
            </NuxtLink>
          </span>
        </div>

        <div class="sec">
          <h4>{{ t('crmB2b.dealsTitle') }}</h4>
          <p
            v-if="detail.deals.length === 0"
            class="crm-held"
          >
            {{ t('crmB2b.noDeals') }}
          </p>
          <table
            v-else
            class="list"
          >
            <thead>
              <tr>
                <th>{{ t('crmB2b.colDeal') }}</th>
                <th>{{ t('crmB2b.colStage') }}</th>
                <th>{{ t('crmB2b.colValue') }}</th>
                <th>{{ t('crmB2b.colBooking') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="deal in detail.deals"
                :key="deal.id"
              >
                <td>{{ deal.title }}</td>
                <td>
                  <span class="pill">{{ deal.stage }}</span>
                </td>
                <td>{{ deal.value_label }}</td>
                <td>
                  <NuxtLink
                    v-if="canRms && deal.booking"
                    :to="bookingHref(deal.booking.reference)"
                  >
                    {{ deal.booking.reference }}
                  </NuxtLink>
                  <template v-else>
                    {{ deal.booking?.reference ?? '—' }}
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="sec">
          <h4>{{ t('crmB2b.colJourney') }}</h4>
          <JourneyEnrolmentDetail
            v-if="fullEnrolment"
            :enrolment="fullEnrolment"
          />
          <p
            v-else-if="detail.enrolment_note"
            class="crm-held"
          >
            {{ detail.enrolment_note }}
          </p>
          <p
            v-else
            class="crm-held"
          >
            {{ t('crmB2b.notEnrolled') }}
          </p>
        </div>
      </template>
    </template>
  </USlideover>
</template>
