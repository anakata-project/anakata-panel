<script setup lang="ts">
import type {
  DealStage,
  MoveDealInput,
  PipelineColumn,
  PipelineDeal,
  PipelineKpis,
  StageMapRow
} from '../../types/api'
import ReasonModal from '../bookings/ReasonModal.vue'
import { canDropOn, slaBadge } from '../crm/salesHelpers'
import { firstApiMessage } from '../../utils/apiForm'

type PipelinePayload = {
  columns: Array<PipelineColumn>
  meta: {
    kpis: PipelineKpis
  }
}

const MOVES: Array<MoveDealInput['stage']> = ['NEW_LEAD', 'QUALIFYING', 'QUOTED', 'NEGOTIATION', 'LOST']

const emptyKpis: PipelineKpis = {
  collected: 0,
  scheduled_in: 0,
  awaiting_first_payment: 0,
  open_pipeline_count: 0,
  open_pipeline_value: 0,
  weighted_forecast: 0,
  overdue: 0
}

const props = defineProps<{
  owner: string
  dealType: string
  q: string
  revision: number
}>()

const emit = defineEmits<{
  open: [id: number]
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useMoney()
const toast = useToast()

const columns = ref<Array<PipelineColumn>>([])
const kpis = ref<PipelineKpis | null>(null)
const stageMap = ref<Array<StageMapRow>>([])
const loadError = ref('')
const draggingId = ref<number | null>(null)
const lostOpen = ref(false)
const lostSubmitting = ref(false)
const lostError = ref('')
const pendingMove = ref<{ id: number, stage: MoveDealInput['stage'] } | null>(null)

const shown = computed(() => kpis.value ?? emptyKpis)

const moveItems = computed(() => MOVES.map(stage => ({
  label: t(`deals.stages.${stage}`),
  value: stage
})))

watch(
  () => [props.owner, props.dealType, props.q, props.revision] as const,
  () => {
    void load()
  },
  { immediate: true }
)

onMounted(() => {
  void loadMap()
})

async function load(): Promise<void> {
  const params = new URLSearchParams()

  if (props.owner !== 'all') {
    params.set('owner', props.owner)
  }

  if (props.dealType !== 'all') {
    params.set('type', props.dealType)
  }

  if (props.q.trim() !== '') {
    params.set('q', props.q.trim())
  }

  const query = params.toString()

  try {
    const payload = await request(query === '' ? '/api/crm/pipeline' : `/api/crm/pipeline?${query}`) as PipelinePayload
    columns.value = payload.columns
    kpis.value = payload.meta.kpis
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmPipeline.moveFailed')
  }
}

async function loadMap(): Promise<void> {
  const payload = await request('/api/crm/pipeline/stage-map') as { data: Array<StageMapRow> }
  stageMap.value = payload.data
}

function cardById(id: number): PipelineDeal | undefined {
  return columns.value.flatMap(column => column.deals).find(deal => deal.id === id)
}

function onDragStart(deal: PipelineDeal, event: DragEvent): void {
  draggingId.value = deal.id
  event.dataTransfer?.setData('text/plain', String(deal.id))
}

function onDragEnd(): void {
  draggingId.value = null
}

function highlight(stage: DealStage): boolean {
  if (draggingId.value === null) {
    return false
  }

  const card = cardById(draggingId.value)

  return card !== undefined && canDropOn(stage, card)
}

async function dropOn(stage: DealStage, event: DragEvent): Promise<void> {
  event.preventDefault()
  const raw = event.dataTransfer?.getData('text/plain')
  const id = raw !== undefined && raw !== '' ? Number(raw) : draggingId.value
  draggingId.value = null

  if (id === null || !Number.isFinite(id) || !MOVES.includes(stage as MoveDealInput['stage'])) {
    return
  }

  const card = cardById(id)

  if (!card) {
    return
  }

  const next = stage as MoveDealInput['stage']

  if (card.may_move && next === 'LOST') {
    pendingMove.value = { id, stage: next }
    lostError.value = ''
    lostOpen.value = true
    return
  }

  await move(id, next, null)
}

async function move(id: number, stage: MoveDealInput['stage'], reason: string | null): Promise<boolean> {
  try {
    await request(`/api/crm/deals/${String(id)}/stage`, {
      method: 'PATCH',
      body: { stage, reason }
    })
    await load()
    return true
  } catch (error: unknown) {
    const message = firstApiMessage(error) ?? t('crmPipeline.moveFailed')

    if (lostOpen.value) {
      lostError.value = message
    } else {
      toast.add({ title: message })
    }

    return false
  }
}

async function submitLost(reason: string): Promise<void> {
  if (pendingMove.value === null) {
    return
  }

  lostSubmitting.value = true
  lostError.value = ''
  const ok = await move(pendingMove.value.id, pendingMove.value.stage, reason)
  lostSubmitting.value = false

  if (ok) {
    lostOpen.value = false
    pendingMove.value = null
  }
}

function onKeyboardMove(deal: PipelineDeal, stage: string | number | boolean | null | undefined): void {
  if (typeof stage !== 'string' || stage === '') {
    return
  }

  if (!deal.may_move || !MOVES.includes(stage as MoveDealInput['stage'])) {
    return
  }

  const next = stage as MoveDealInput['stage']

  if (next === 'LOST') {
    pendingMove.value = { id: deal.id, stage: next }
    lostError.value = ''
    lostOpen.value = true
    return
  }

  void move(deal.id, next, null)
}

function bookingTo(reference: string): string {
  return `/rms/reservations/bookings?open=${encodeURIComponent(reference)}`
}
</script>

<template>
  <div>
    <div class="krow">
      <AnkKpi
        :label="t('crmPipeline.kpiCollected')"
        :sub="t('crmPipeline.kpiCollectedSub')"
      >
        {{ format(shown.collected) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiScheduled')"
        :sub="t('crmPipeline.kpiScheduledSub')"
      >
        {{ format(shown.scheduled_in) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiAwaiting')"
        :sub="t('crmPipeline.kpiAwaitingSub')"
      >
        {{ format(shown.awaiting_first_payment) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiOpen')"
        :sub="t('crmPipeline.kpiOpenSub', { count: String(shown.open_pipeline_count) })"
      >
        {{ format(shown.open_pipeline_value) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiWeighted')"
        :sub="t('crmPipeline.kpiWeightedSub')"
      >
        <span class="crm-kpi-alert">{{ format(shown.weighted_forecast) }}</span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiOverdue')"
        :sub="t('crmPipeline.kpiOverdueSub')"
      >
        <span class="crm-kpi-alert">{{ format(shown.overdue) }}</span>
      </AnkKpi>
    </div>

    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>

    <p class="notice crm-notice">
      {{ t('crmPipeline.notice') }}
    </p>

    <div class="panel">
      <div class="pipe">
        <section
          v-for="column in columns"
          :key="column.stage"
          class="col"
          :class="{ drop: highlight(column.stage) }"
          @dragover.prevent
          @drop="dropOn(column.stage, $event)"
        >
          <h3>
            {{ column.label }}
            <span class="sla">{{ column.sla }}</span>
            <span class="money">{{ format(column.total) }} · {{ column.weighted_total === null ? '—' : format(column.weighted_total) }}</span>
          </h3>
          <div class="cards">
            <article
              v-for="deal in column.deals"
              :key="deal.id"
              class="card"
              :class="{ dragging: draggingId === deal.id }"
              draggable="true"
              @dragstart="onDragStart(deal, $event)"
              @dragend="onDragEnd"
            >
              <span
                v-if="!deal.may_move"
                class="lock"
              >{{ t('crmPipeline.locked') }}</span>
              <span
                v-if="slaBadge(deal.sla_state)"
                class="slabadge"
                :class="deal.sla_state ?? 'ok'"
              >{{ slaBadge(deal.sla_state) }}</span>
              <button
                type="button"
                class="nm"
                @click="emit('open', deal.id)"
              >
                {{ deal.title }}
              </button>
              <span class="mono">{{ deal.type }} · {{ deal.owner?.name ?? t('crmPipeline.unassigned') }}</span>
              <NuxtLink
                v-if="deal.booking"
                class="rmsref"
                :to="bookingTo(deal.booking.reference)"
              >
                {{ deal.booking.reference }}
              </NuxtLink>
              <span
                v-else
                class="rmsref none"
              >{{ t('crmPipeline.noRmsYet') }}</span>
              <span class="val">{{ format(deal.value) }} {{ deal.value_label }}</span>
              <span class="mono">{{ deal.contact.name }}</span>
              <USelect
                v-if="deal.may_move"
                :model-value="undefined"
                class="move"
                size="sm"
                :placeholder="t('crmPipeline.moveTo')"
                :items="moveItems"
                @update:model-value="onKeyboardMove(deal, $event)"
                @click.stop
              />
            </article>
          </div>
        </section>
      </div>
    </div>

    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('crmPipeline.stageMap') }}</h3>
      </div>
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('crmPipeline.stage') }}</th>
            <th>{{ t('crmPipeline.owner') }}</th>
            <th>{{ t('crmPipeline.enters') }}</th>
            <th>{{ t('crmPipeline.leaves') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in stageMap"
            :key="row.stage"
          >
            <td>{{ row.label }}</td>
            <td>{{ row.owner }}</td>
            <td>{{ row.enters_when }}</td>
            <td>{{ row.leaves_when }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <ReasonModal
      v-model:open="lostOpen"
      :title="t('crmPipeline.lostTitle')"
      hint="required"
      :submitting="lostSubmitting"
      :error="lostError"
      @submit="submitLost"
    />
  </div>
</template>
