<script setup lang="ts">
import type { Alert, AlertKindRow, AlertSeverity } from '../../types/api'
import { ALERT_FILTER_ALL, alertFilterItems, alertSeverityClass } from './alertHelpers'
import { firstApiMessage } from '../../utils/apiForm'

type AlertListPayload = {
  data: Array<Alert>
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
    counts: {
      INFO: number
      WARN: number
      CRITICAL: number
    }
  }
}

type KindsPayload = {
  data: Array<AlertKindRow>
}

const props = defineProps<{
  section: 'rms' | 'crm'
}>()

const STATES = [
  { id: 'open', labelKey: 'alerts.tabOpen' },
  { id: 'acknowledged', labelKey: 'alerts.tabAcknowledged' },
  { id: 'resolved', labelKey: 'alerts.tabResolved' }
] as const

const SEVERITIES: Array<AlertSeverity> = ['CRITICAL', 'WARN', 'INFO']

const { t } = useI18n()
const route = useRoute()
const { request } = useApi()
const { format } = useDates()
const { refresh: refreshBell } = useAlertCounts()
const toast = useToast()

const state = ref<(typeof STATES)[number]['id']>('open')
const severity = ref(ALERT_FILTER_ALL)
const kind = ref(ALERT_FILTER_ALL)
const page = ref(1)
const rows = ref<Array<Alert>>([])
const meta = ref<AlertListPayload['meta'] | null>(null)
const kinds = ref<Array<AlertKindRow>>([])
const loadError = ref('')
const acknowledgingId = ref<number | null>(null)

const sectionKinds = computed(() => kinds.value.filter(row => row.section === props.section))

const severityItems = computed(() => alertFilterItems(
  t('alerts.severityAll'),
  SEVERITIES.map(option => ({
    label: option,
    value: option
  }))
))

const kindItems = computed(() => alertFilterItems(
  t('alerts.kindAll'),
  sectionKinds.value.map(option => ({
    label: option.label,
    value: option.kind
  }))
))

watch([state, severity, kind], () => {
  if (page.value !== 1) {
    page.value = 1
    return
  }

  void load()
})

watch(page, () => {
  void load()
})

onMounted(() => {
  void boot()
})

function queryKind(): string | null {
  const raw = route.query.kind
  const key = Array.isArray(raw) ? raw[0] : raw

  return typeof key === 'string' ? key : null
}

async function boot(): Promise<void> {
  await loadKinds()

  if (kind.value === ALERT_FILTER_ALL) {
    await load()
  }
}

function raisedLabel(value: string | null): string {
  return value === null ? '—' : format(value, 'dateTime')
}

function audienceLabel(row: AlertKindRow): string {
  if (row.audience.length === 0) {
    return '—'
  }

  return row.audience.map(entry => entry.label).join(' · ')
}

async function loadKinds(): Promise<void> {
  try {
    const payload = await request('/api/alerts/kinds') as KindsPayload
    kinds.value = payload.data
  } catch {
    kinds.value = []
  }

  const requested = queryKind()

  if (requested !== null && sectionKinds.value.some(row => row.kind === requested)) {
    kind.value = requested
  }
}

async function load(): Promise<void> {
  const params = new URLSearchParams({
    state: state.value,
    section: props.section,
    page: String(page.value)
  })

  if (severity.value !== ALERT_FILTER_ALL) {
    params.set('severity', severity.value)
  }

  if (kind.value !== ALERT_FILTER_ALL) {
    params.set('kind', kind.value)
  }

  try {
    const payload = await request(`/api/alerts?${params.toString()}`) as AlertListPayload
    rows.value = payload.data
    meta.value = payload.meta
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('alerts.failed')
  }
}

async function acknowledge(row: Alert): Promise<void> {
  if (!row.may_acknowledge || acknowledgingId.value !== null) {
    return
  }

  acknowledgingId.value = row.id

  try {
    await request(`/api/alerts/${String(row.id)}/acknowledge`, { method: 'POST' })
    await Promise.all([load(), refreshBell()])
  } catch (error: unknown) {
    toast.add({
      title: firstApiMessage(error) ?? t('alerts.acknowledgeFailed')
    })
  } finally {
    acknowledgingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="ebtool dep-toolbar">
      <div class="fchips">
        <button
          v-for="tab in STATES"
          :key="tab.id"
          type="button"
          class="fchip"
          :class="{ on: state === tab.id }"
          @click="state = tab.id"
        >
          {{ t(tab.labelKey) }}
        </button>
      </div>
      <div class="list-filters">
        <USelect
          v-model="severity"
          size="sm"
          :items="severityItems"
          :aria-label="t('alerts.severityAll')"
        />
        <USelect
          v-model="kind"
          size="sm"
          :items="kindItems"
          :aria-label="t('alerts.kindAll')"
        />
      </div>
    </div>

    <div class="panel">
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('alerts.colSeverity') }}</th>
              <th>{{ t('alerts.colAlert') }}</th>
              <th class="nw">
                {{ t('alerts.colRaised') }}
              </th>
              <th>{{ t('alerts.colSubject') }}</th>
              <th>{{ t('alerts.colTask') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="loadError !== ''"
              class="dr-empty"
            >
              <td colspan="6">
                {{ loadError }}
              </td>
            </tr>
            <tr
              v-else-if="rows.length === 0"
              class="dr-empty"
            >
              <td colspan="6">
                {{ t('alerts.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
            >
              <td>
                <span
                  class="pill"
                  :class="alertSeverityClass(row.severity)"
                >{{ row.severity }}</span>
              </td>
              <td>
                {{ row.title }}
                <div class="gmeta">
                  {{ row.sentence }}
                </div>
                <div
                  v-if="row.resolution"
                  class="gmeta"
                >
                  {{ row.resolution }}
                </div>
              </td>
              <td class="nw">
                {{ raisedLabel(row.raised_at) }}
              </td>
              <td class="nw">
                <NuxtLink
                  v-if="row.subject.reference !== ''"
                  :to="row.subject.href"
                  class="bk-ref"
                >
                  {{ row.subject.reference }}
                </NuxtLink>
                <template v-else>
                  —
                </template>
              </td>
              <td>
                <NuxtLink
                  v-if="row.task"
                  :to="row.task.href"
                >
                  {{ row.task.title }}
                </NuxtLink>
                <template v-else>
                  —
                </template>
              </td>
              <td class="list-actions">
                <button
                  v-if="row.may_acknowledge"
                  type="button"
                  class="mini"
                  :disabled="acknowledgingId === row.id"
                  @click="acknowledge(row)"
                >
                  {{ t('alerts.acknowledge') }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div
        v-if="meta && meta.last_page > 1"
        class="list-pager"
      >
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          @click="page -= 1"
        >
          {{ t('alerts.previous') }}
        </button>
        <span>{{ t('alerts.pager', { page: String(meta.current_page), total: String(meta.total) }) }}</span>
        <button
          type="button"
          :disabled="meta.current_page >= meta.last_page"
          @click="page += 1"
        >
          {{ t('alerts.next') }}
        </button>
      </div>
    </div>

    <div class="panel">
      <h3>{{ t('alerts.legendTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('alerts.colKind') }}</th>
              <th>{{ t('alerts.colCondition') }}</th>
              <th>{{ t('alerts.colAudience') }}</th>
              <th>{{ t('alerts.colResolves') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in sectionKinds"
              :key="`kind-${row.kind}`"
            >
              <td>
                {{ row.label }}
                <div class="gmeta">
                  {{ row.kind }}
                </div>
              </td>
              <td>{{ row.condition }}</td>
              <td>{{ audienceLabel(row) }}</td>
              <td>{{ row.resolves_when }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
