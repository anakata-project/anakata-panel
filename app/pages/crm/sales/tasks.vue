<script setup lang="ts">
import type { CrmTask, TaskKind, TaskKpis } from '../../../types/api'
import ReasonModal from '../../../components/bookings/ReasonModal.vue'
import DealDrawer from '../../../components/crm/DealDrawer.vue'
import NewTaskModal from '../../../components/crm/NewTaskModal.vue'
import { relativeDue, taskPriorityClass } from '../../../components/crm/salesHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

type TaskPayload = {
  data: Array<CrmTask>
  meta: {
    kpis: TaskKpis
  }
}

const KINDS: Array<TaskKind> = [
  'REQUEST_RESPONSE',
  'CHARTER_QUOTE',
  'OVERDUE_DECISION',
  'COMMISSION_CAP',
  'WIRE_WINDOW',
  'REFUND_DECISION',
  'DEAL_QUOTE',
  'MANUAL',
  'SUBJECT_REQUEST'
]

const emptyKpis: TaskKpis = {
  open: 0,
  breached: 0,
  near: 0,
  system: 0,
  quote_sla_hours: 0
}

const { t } = useI18n()
const { request } = useApi()
const { can } = useAuth()
const toast = useToast()

const scope = ref<'mine' | 'unassigned' | 'all'>('mine')
const closed = ref(false)
const kind = ref('')
const due = ref('')
const rows = ref<Array<CrmTask>>([])
const kpis = ref<TaskKpis | null>(null)
const loadError = ref('')
const newOpen = ref(false)
const completeOpen = ref(false)
const completeSubmitting = ref(false)
const completeError = ref('')
const completing = ref<CrmTask | null>(null)
const drawerOpen = ref(false)
const drawerId = ref<number | null>(null)
const revision = ref(0)

const shown = computed(() => kpis.value ?? emptyKpis)
const canSeeAll = computed(() => can('records.act_on_any'))
const canCreate = computed(() => can('contacts.manage'))

watch([scope, closed, kind, due], () => {
  void load()
})

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  const params = new URLSearchParams()
  params.set('scope', scope.value)
  params.set('status', closed.value ? 'closed' : 'open')

  if (kind.value !== '') {
    params.set('kind', kind.value)
  }

  if (due.value !== '') {
    params.set('due', due.value)
  }

  const query = params.toString()

  try {
    const payload = await request(`/api/crm/tasks?${query}`) as TaskPayload
    rows.value = payload.data
    kpis.value = payload.meta.kpis
    loadError.value = ''
    revision.value += 1
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmTasks.failed')
  }
}

function openComplete(task: CrmTask): void {
  completing.value = task
  completeError.value = ''
  completeOpen.value = true
}

async function submitComplete(outcome: string): Promise<void> {
  if (completing.value === null) {
    return
  }

  completeSubmitting.value = true
  completeError.value = ''

  try {
    await request(`/api/crm/tasks/${String(completing.value.id)}/complete`, {
      method: 'POST',
      body: { outcome }
    })
    completeOpen.value = false
    completing.value = null
    toast.add({ title: t('crmTasks.completed') })
    await load()
  } catch (error: unknown) {
    completeError.value = firstApiMessage(error) ?? t('crmTasks.failed')
  } finally {
    completeSubmitting.value = false
  }
}

function openDeal(id: number): void {
  drawerId.value = id
  drawerOpen.value = true
}
</script>

<template>
  <div>
    <div class="krow">
      <AnkKpi
        :label="t('crmTasks.kpiOpen')"
        :sub="t('crmTasks.kpiOpenSub')"
      >
        {{ shown.open }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmTasks.kpiBreached')"
        :sub="t('crmTasks.kpiBreachedSub')"
      >
        <span class="crm-kpi-alert">{{ shown.breached }}</span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmTasks.kpiNear')"
        :sub="t('crmTasks.kpiNearSub')"
      >
        <span class="crm-kpi-warn">{{ shown.near }}</span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmTasks.kpiSystem')"
        :sub="t('crmTasks.kpiSystemSub')"
      >
        {{ shown.system }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmTasks.kpiQuote')"
        :sub="t('crmTasks.kpiQuoteSub')"
      >
        {{ shown.quote_sla_hours }}
      </AnkKpi>
    </div>

    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>

    <p class="notice crm-notice">
      {{ t('crmTasks.notice') }}
    </p>

    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('crmTasks.title') }}</h3>
        <UButton
          v-if="canCreate"
          @click="newOpen = true"
        >
          {{ t('crmTasks.newTask') }}
        </UButton>
      </div>
      <div class="ebtool dep-toolbar">
        <div class="fchips">
          <button
            type="button"
            class="fchip"
            :class="{ on: scope === 'mine' }"
            @click="scope = 'mine'"
          >
            {{ t('crmTasks.mine') }}
          </button>
          <button
            type="button"
            class="fchip"
            :class="{ on: scope === 'unassigned' }"
            @click="scope = 'unassigned'"
          >
            {{ t('crmTasks.unassigned') }}
          </button>
          <button
            v-if="canSeeAll"
            type="button"
            class="fchip"
            :class="{ on: scope === 'all' }"
            @click="scope = 'all'"
          >
            {{ t('crmTasks.all') }}
          </button>
        </div>
        <label class="crm-check">
          <input
            v-model="closed"
            type="checkbox"
          >
          {{ t('crmTasks.closed') }}
        </label>
        <select v-model="kind">
          <option value="">
            {{ t('crmTasks.kindAll') }}
          </option>
          <option
            v-for="item in KINDS"
            :key="item"
            :value="item"
          >
            {{ t(`crmTasks.kinds.${item}`) }}
          </option>
        </select>
        <select v-model="due">
          <option value="">
            {{ t('crmTasks.dueAll') }}
          </option>
          <option value="overdue">
            {{ t('crmTasks.dueOverdue') }}
          </option>
          <option value="today">
            {{ t('crmTasks.dueToday') }}
          </option>
          <option value="week">
            {{ t('crmTasks.dueWeek') }}
          </option>
        </select>
      </div>

      <div
        v-if="rows.length === 0"
        class="crm-held"
      >
        {{ t('crmTasks.empty') }}
      </div>
      <div
        v-for="task in rows"
        :key="task.id"
        class="taskrow"
      >
        <div
          class="due"
          :class="taskPriorityClass(task.priority)"
        >
          {{ relativeDue(task.due_at) }}
        </div>
        <div>
          <div class="ttl">
            {{ task.title }}
          </div>
          <div
            v-if="task.context"
            class="ctx"
          >
            {{ task.context }}
          </div>
        </div>
        <div>
          <span class="sysbadge">{{ task.source_label }}</span>
          <span
            v-if="task.needs_permission"
            class="pill bad"
          >{{ task.needs_permission }}</span>
        </div>
        <div class="ctx">
          {{ task.owner?.name ?? t('crmPipeline.unassigned') }}
          <NuxtLink
            v-if="task.booking"
            class="lnk"
            :to="`/rms/reservations/bookings?open=${task.booking.reference}`"
          >
            {{ task.booking.reference }}
          </NuxtLink>
          <NuxtLink
            v-if="task.contact"
            class="lnk"
            :to="`/crm/sales/contacts?open=${String(task.contact.id)}`"
          >
            {{ task.contact.name }}
          </NuxtLink>
          <button
            v-if="task.deal"
            type="button"
            class="lnk"
            @click="openDeal(task.deal.id)"
          >
            {{ task.deal.title }}
          </button>
        </div>
        <div class="row-actions">
          <NuxtLink
            v-if="task.source === 'SYSTEM' && task.booking"
            class="lnk"
            :to="`/rms/reservations/bookings?open=${task.booking.reference}`"
          >
            {{ t('crmTasks.openRms') }}
          </NuxtLink>
          <UButton
            v-if="task.may_complete"
            variant="outline"
            @click="openComplete(task)"
          >
            {{ t('crmTasks.complete') }}
          </UButton>
        </div>
      </div>
      <p class="crm-hint">
        {{ t('crmTasks.completeHint') }}
      </p>
    </div>

    <NewTaskModal
      v-model:open="newOpen"
      @created="load"
    />
    <DealDrawer
      v-model:open="drawerOpen"
      :deal-id="drawerId"
      :revision="revision"
      @changed="load"
    />
    <ReasonModal
      v-model:open="completeOpen"
      :title="t('crmTasks.completeTitle')"
      :label="t('crmTasks.outcome')"
      hint="required"
      :submitting="completeSubmitting"
      :error="completeError"
      @submit="submitComplete"
    >
      <template #extra>
        <p class="crm-held">
          {{ t('crmTasks.completeHint') }}
        </p>
      </template>
    </ReasonModal>
  </div>
</template>
