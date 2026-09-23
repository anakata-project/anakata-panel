<script setup lang="ts">
import type { B2bPartnerRow } from '../../../types/api'
import B2bPartnerDrawer from '../../../components/crm/B2bPartnerDrawer.vue'
import { firstApiMessage } from '../../../utils/apiForm'

type B2bPartnerListRow = Exclude<B2bPartnerRow, { deals: ReadonlyArray<unknown> }>

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()

const rows = ref<Array<B2bPartnerListRow>>([])
const loadError = ref('')
const drawerOpen = ref(false)
const selectedId = ref<number | null>(null)
const canRms = computed(() => can('panel.rms'))
const columnCount = computed(() => canRms.value ? 9 : 8)

function contactHref(id: number): string {
  return `/crm/sales/contacts?open=${String(id)}`
}

function rmsHref(id: number): string {
  return `/rms/commercial/b2b?open=${String(id)}`
}

async function load(): Promise<void> {
  try {
    const result = await request('/api/crm/b2b-partners') as { data: Array<B2bPartnerListRow> }
    rows.value = result.data
    loadError.value = ''
  } catch (caught: unknown) {
    loadError.value = firstApiMessage(caught) ?? t('crmB2b.failed')
  }
}

onMounted(() => {
  void load()
})

function openRow(id: number): void {
  selectedId.value = id
  drawerOpen.value = true
}
</script>

<template>
  <div>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>

    <div class="panel">
      <h3>{{ t('crmB2b.title') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmB2b.colPartner') }}</th>
              <th>{{ t('crmB2b.colStatus') }}</th>
              <th>{{ t('crmB2b.colContact') }}</th>
              <th>{{ t('crmB2b.colRate') }}</th>
              <th class="nw">
                {{ t('crmB2b.colRevenue') }}
              </th>
              <th class="nw">
                {{ t('crmB2b.colCommission') }}
              </th>
              <th>{{ t('crmB2b.colDeals') }}</th>
              <th>{{ t('crmB2b.colJourney') }}</th>
              <th v-if="canRms" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="rows.length === 0"
              class="dr-empty"
            >
              <td :colspan="columnCount">
                {{ t('crmB2b.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="bk-row"
              @click="openRow(row.id)"
            >
              <td>{{ row.name }}</td>
              <td>
                <span class="pill">{{ row.status }}</span>
              </td>
              <td @click.stop>
                <NuxtLink
                  v-if="row.contact"
                  :to="contactHref(row.contact.id)"
                >
                  {{ row.contact.name }}
                </NuxtLink>
                <p
                  v-else
                  class="crm-held"
                >
                  {{ row.enrolment_note }}
                </p>
              </td>
              <td class="nw">
                {{ row.commission_pct }}%
              </td>
              <td class="nw">
                {{ money(row.revenue) }}
              </td>
              <td class="nw">
                {{ money(row.commission_accrued) }}
              </td>
              <td>{{ row.open_deal_count }}</td>
              <td>
                <template v-if="row.enrolment">
                  <span class="pill">{{ row.enrolment.status }}</span>
                  <div>{{ row.enrolment.step?.name ?? '—' }}</div>
                  <div class="mono">
                    {{ format(row.enrolment.next_due_at, 'dateTime') }}
                  </div>
                </template>
                <p
                  v-else-if="row.enrolment_note"
                  class="crm-held"
                >
                  {{ row.enrolment_note }}
                </p>
                <p
                  v-else
                  class="crm-held"
                >
                  {{ t('crmB2b.notEnrolled') }}
                </p>
              </td>
              <td
                v-if="canRms"
                @click.stop
              >
                <NuxtLink :to="rmsHref(row.id)">
                  {{ t('crmB2b.openRms') }}
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <B2bPartnerDrawer
      v-model:open="drawerOpen"
      :agency-id="selectedId"
    />
  </div>
</template>
