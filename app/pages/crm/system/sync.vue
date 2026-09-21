<script setup lang="ts">
import type {
  EventCatalogueRow,
  OwnershipRow,
  Paginated,
  ScheduledJobRun,
  SyncFailure,
  SyncIdentityRow,
  SyncKpis
} from '../../../types/api'
import {
  jobOutcomePillClass,
  systemBadgeClass
} from '../../../components/crm/syncHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

type JobsPayload = {
  data: Array<ScheduledJobRun>
  meta: {
    kpis: SyncKpis
  }
}

type EventsPayload = {
  data: Array<EventCatalogueRow>
  meta: {
    note: string
  }
}

const emptyKpis: SyncKpis = {
  jobs_failing: 0,
  failures_open: 0,
  merges_this_month: 0
}

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format } = useDates()
const toast = useToast()

const identityPage = ref(1)
const retryingId = ref<string | null>(null)
const resendOpen = ref(false)
const resendTarget = ref<SyncFailure | null>(null)
const retryError = ref('')

const canRetry = computed(() => can('sync.retry'))

const { data: jobsPayload, refresh: refreshJobs } = useFetch<JobsPayload>('/api/crm/sync/jobs')
const { data: ownershipPayload } = useFetch<{ data: Array<OwnershipRow> }>('/api/crm/sync/ownership')
const { data: eventsPayload } = useFetch<EventsPayload>('/api/crm/sync/events')
const { data: failuresPayload, refresh: refreshFailures } = useFetch<{ data: Array<SyncFailure> }>('/api/crm/sync/failures')

const identityUrl = computed(() => `/api/crm/sync/identity?page=${String(identityPage.value)}`)
const { data: identityPayload } = useFetch<Paginated<SyncIdentityRow>>(identityUrl)

const jobs = computed(() => jobsPayload.value?.data ?? [])
const kpis = computed(() => jobsPayload.value?.meta.kpis ?? emptyKpis)
const ownership = computed(() => ownershipPayload.value?.data ?? [])
const events = computed(() => eventsPayload.value?.data ?? [])
const busNote = computed(() => eventsPayload.value?.meta.note ?? '')
const failures = computed(() => failuresPayload.value?.data ?? [])
const merges = computed(() => identityPayload.value?.data ?? [])
const identityMeta = computed(() => identityPayload.value?.meta)

function jobLastRun(row: ScheduledJobRun): string {
  return row.last_finished_at ?? row.last_started_at ?? ''
}

function jobCadence(row: ScheduledJobRun): string {
  return row.timezone === null || row.timezone === ''
    ? row.cadence
    : `${row.cadence} · ${row.timezone}`
}

function listenersLabel(listeners: ReadonlyArray<string>): string {
  return listeners.length === 0 ? '—' : listeners.join(', ')
}

function startRetry(row: SyncFailure): void {
  if (retryingId.value !== null) {
    return
  }

  retryError.value = ''

  if (row.kind === 'delivery') {
    resendTarget.value = row
    resendOpen.value = true
    return
  }

  void sendRetry(row, 'job')
}

function cancelResend(): void {
  resendOpen.value = false
  resendTarget.value = null
  retryError.value = ''
}

async function confirmResend(): Promise<void> {
  if (resendTarget.value === null) {
    return
  }

  await sendRetry(resendTarget.value, 'delivery')
}

async function sendRetry(row: SyncFailure, kind: 'job' | 'delivery'): Promise<void> {
  retryingId.value = row.id
  retryError.value = ''

  try {
    await request(`/api/crm/sync/failures/${encodeURIComponent(row.id)}/retry`, {
      method: 'POST'
    })
    resendOpen.value = false
    resendTarget.value = null
    toast.add({
      title: kind === 'delivery' ? t('crmSync.resentToast') : t('crmSync.retriedToast')
    })
    await Promise.all([refreshFailures(), refreshJobs()])
  } catch (error: unknown) {
    retryError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : t('crmSync.retryFailed'))
    toast.add({ title: retryError.value })
  } finally {
    retryingId.value = null
  }
}
</script>

<template>
  <div>
    <div class="krow">
      <AnkKpi
        :label="t('crmSync.kpiJobsFailing')"
        :sub="t('crmSync.kpiJobsFailingSub')"
      >
        <span :class="{ 'pay-kpi-coral': kpis.jobs_failing > 0 }">
          {{ kpis.jobs_failing }}
        </span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmSync.kpiFailuresOpen')"
        :sub="t('crmSync.kpiFailuresOpenSub')"
      >
        <span :class="{ 'pay-kpi-coral': kpis.failures_open > 0 }">
          {{ kpis.failures_open }}
        </span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmSync.kpiMerges')"
        :sub="t('crmSync.kpiMergesSub')"
      >
        {{ kpis.merges_this_month }}
      </AnkKpi>
    </div>

    <div class="panel">
      <h3>{{ t('crmSync.ownershipTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th class="nw">
                {{ t('crmSync.colObject') }}
              </th>
              <th>{{ t('crmSync.colFieldGroup') }}</th>
              <th class="nw">
                {{ t('crmSync.colSystem') }}
              </th>
              <th class="nw">
                {{ t('crmSync.colReadBy') }}
              </th>
              <th>{{ t('crmSync.colRule') }}</th>
              <th class="nw">
                {{ t('crmSync.colCode') }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="ownership.length === 0"
              class="dr-empty"
            >
              <td colspan="6">
                {{ t('crmSync.emptyOwnership') }}
              </td>
            </tr>
            <tr
              v-for="row in ownership"
              :key="row.object"
            >
              <td class="nw">
                {{ row.object }}
              </td>
              <td>{{ row.field_group }}</td>
              <td class="nw">
                <span
                  class="sysbadge"
                  :class="systemBadgeClass(row.system_of_record)"
                >{{ row.system_of_record }}</span>
              </td>
              <td class="nw">
                {{ row.read_by }}
              </td>
              <td>{{ row.rule }}</td>
              <td class="nw crm-code">
                {{ row.code ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>{{ t('crmSync.eventsTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th class="nw">
                {{ t('crmSync.colEvent') }}
              </th>
              <th class="nw">
                {{ t('crmSync.colFamily') }}
              </th>
              <th class="nw">
                {{ t('crmSync.colProducer') }}
              </th>
              <th>{{ t('crmSync.colListeners') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="events.length === 0"
              class="dr-empty"
            >
              <td colspan="4">
                {{ t('crmSync.emptyEvents') }}
              </td>
            </tr>
            <tr
              v-for="row in events"
              :key="row.name"
            >
              <td class="nw crm-event">
                {{ row.name }}
              </td>
              <td class="nw">
                {{ row.family }}
              </td>
              <td class="nw">
                {{ row.producer }}
              </td>
              <td>{{ listenersLabel(row.listeners) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>{{ t('crmSync.failuresTitle') }}</h3>
      <p
        v-if="busNote !== ''"
        class="crm-bus-note"
      >
        {{ busNote }}
      </p>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th class="nw">
                {{ t('crmSync.colWhen') }}
              </th>
              <th class="nw">
                {{ t('crmSync.colKind') }}
              </th>
              <th>{{ t('crmSync.colName') }}</th>
              <th>{{ t('crmSync.colDetail') }}</th>
              <th class="nw" />
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="failures.length === 0"
              class="dr-empty"
            >
              <td colspan="5">
                {{ t('crmSync.emptyFailures') }}
              </td>
            </tr>
            <tr
              v-for="row in failures"
              :key="row.id"
            >
              <td class="nw">
                {{ format(row.at, 'dateTime') }}
              </td>
              <td class="nw">
                {{ row.kind }}
              </td>
              <td>{{ row.name }}</td>
              <td>{{ row.detail }}</td>
              <td class="nw list-actions">
                <UButton
                  v-if="canRetry && (row.kind === 'job' || row.kind === 'delivery')"
                  variant="outline"
                  :disabled="retryingId === row.id"
                  :loading="retryingId === row.id"
                  @click="startRetry(row)"
                >
                  {{ row.kind === 'delivery' ? t('crmSync.resend') : t('crmSync.retry') }}
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="crm-grid2">
      <div class="panel">
        <h3>{{ t('crmSync.jobsTitle') }}</h3>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th>{{ t('crmSync.colCommand') }}</th>
                <th class="nw">
                  {{ t('crmSync.colCadence') }}
                </th>
                <th class="nw">
                  {{ t('crmSync.colLastRun') }}
                </th>
                <th class="nw">
                  {{ t('crmSync.colOutcome') }}
                </th>
                <th class="nw">
                  {{ t('crmSync.colNext') }}
                </th>
                <th>{{ t('crmSync.colPurpose') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="jobs.length === 0"
                class="dr-empty"
              >
                <td colspan="6">
                  {{ t('crmSync.emptyJobs') }}
                </td>
              </tr>
              <tr
                v-for="row in jobs"
                :key="row.command"
                :class="{ 'crm-job-failed': row.last_outcome === 'failed' }"
              >
                <td>{{ row.command }}</td>
                <td class="nw">
                  {{ jobCadence(row) }}
                </td>
                <td class="nw">
                  {{ jobLastRun(row) === '' ? t('crmSync.neverRun') : format(jobLastRun(row), 'dateTime') }}
                </td>
                <td class="nw">
                  <span
                    v-if="row.last_outcome !== null"
                    class="pill"
                    :class="jobOutcomePillClass(row.last_outcome)"
                  >{{ row.last_outcome }}</span>
                  <template v-else>
                    {{ t('crmSync.neverRun') }}
                  </template>
                </td>
                <td class="nw">
                  {{ format(row.next_run_at, 'dateTime') }}
                </td>
                <td>{{ row.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="panel">
        <h3>{{ t('crmSync.identityTitle') }}</h3>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th class="nw">
                  {{ t('crmSync.colSurvivor') }}
                </th>
                <th class="nw">
                  {{ t('crmSync.colLoser') }}
                </th>
                <th class="nw">
                  {{ t('crmSync.colMergedBy') }}
                </th>
                <th class="nw">
                  {{ t('crmSync.colWhen') }}
                </th>
                <th>{{ t('crmSync.colReason') }}</th>
                <th class="nw">
                  {{ t('crmSync.colUndone') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="merges.length === 0"
                class="dr-empty"
              >
                <td colspan="6">
                  {{ t('crmSync.emptyIdentity') }}
                </td>
              </tr>
              <tr
                v-for="row in merges"
                :key="row.id"
              >
                <td class="nw">
                  <NuxtLink
                    class="lnk"
                    :to="`/crm/sales/contacts?open=${String(row.survivor_id)}`"
                  >
                    #{{ row.survivor_id }}
                  </NuxtLink>
                </td>
                <td class="nw">
                  <NuxtLink
                    class="lnk"
                    :to="`/crm/sales/contacts?open=${String(row.loser_id)}`"
                  >
                    #{{ row.loser_id }}
                  </NuxtLink>
                </td>
                <td class="nw">
                  {{ row.merged_by }}
                </td>
                <td class="nw">
                  {{ format(row.merged_at, 'dateTime') }}
                </td>
                <td>{{ row.reason }}</td>
                <td class="nw">
                  {{ row.undone ? (row.undone_at === null ? t('crmSync.undone') : format(row.undone_at, 'dateTime')) : '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div
          v-if="identityMeta && identityMeta.last_page > 1"
          class="list-pager"
        >
          <button
            type="button"
            :disabled="identityMeta.current_page <= 1"
            @click="identityPage -= 1"
          >
            {{ t('bookings.previous') }}
          </button>
          <span>{{ t('bookings.pager', { from: String(identityMeta.from ?? 0), to: String(identityMeta.to ?? 0), total: String(identityMeta.total) }) }}</span>
          <button
            type="button"
            :disabled="identityMeta.current_page >= identityMeta.last_page"
            @click="identityPage += 1"
          >
            {{ t('bookings.next') }}
          </button>
        </div>
      </div>
    </div>

    <UModal
      :open="resendOpen"
      :title="t('crmSync.resendTitle')"
      @update:open="resendOpen = $event"
    >
      <template #body>
        <div class="modal-form">
          <p class="notice">
            {{ t('crmSync.resendBody') }}
          </p>
          <div class="modal-actions">
            <UButton
              variant="outline"
              :disabled="retryingId !== null"
              @click="cancelResend"
            >
              {{ t('bookings.cancel') }}
            </UButton>
            <UButton
              :loading="retryingId !== null"
              :disabled="retryingId !== null"
              @click="confirmResend"
            >
              {{ t('crmSync.resend') }}
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
