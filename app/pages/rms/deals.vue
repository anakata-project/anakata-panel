<script setup lang="ts">
import type { DealStage, DealType, Paginated, PipelineKpis, UserListItem } from '../../types/api'
import DealsBoard from '../../components/deals/DealsBoard.vue'
import DealsTable from '../../components/deals/DealsTable.vue'
import DealDrawer from '../../components/crm/DealDrawer.vue'
import NewDealModal from '../../components/crm/NewDealModal.vue'
import { SELECT_ALL, withSelectAll } from '../../components/crm/salesHelpers'
import { DEAL_VIEW_IDS, viewFromQuery, type DealViewId } from '../../components/bookings/bookingViews'

const SEARCH_DEBOUNCE_MS = 300

const STAGES: Array<DealStage> = [
  'NEW_LEAD',
  'QUALIFYING',
  'QUOTED',
  'NEGOTIATION',
  'DEPOSIT_PENDING',
  'BOOKING_CONFIRMED',
  'WON_COMPLETED',
  'LOST'
]

const TYPES: Array<DealType> = ['FIT', 'GROUP', 'CHARTER', 'AGENCY']

const emptyKpis: PipelineKpis = {
  collected: 0,
  scheduled_in: 0,
  awaiting_first_payment: 0,
  open_pipeline_count: 0,
  open_pipeline_value: 0,
  weighted_forecast: 0,
  overdue: 0
}

const { t } = useI18n()
const { request } = useApi()
const { can } = useAuth()
const { format } = useMoney()
const route = useRoute()
const router = useRouter()

const owner = ref(SELECT_ALL)
const dealType = ref(SELECT_ALL)
const stage = ref(SELECT_ALL)
const searchInput = ref('')
const q = ref('')
const revision = ref(0)
const users = ref<Array<UserListItem>>([])
const drawerOpen = ref(false)
const drawerId = ref<number | null>(null)
const newOpen = ref(false)
const kpis = ref<PipelineKpis>(emptyKpis)

let searchTimer: ReturnType<typeof setTimeout> | undefined

const view = computed(() => viewFromQuery(route.query.view, DEAL_VIEW_IDS, 'board'))
const canMove = computed(() => can('pipeline.move_stage'))

const ownerItems = computed(() => withSelectAll(t('crmPipeline.ownerAll'), [
  { label: t('crmPipeline.ownerMe'), value: 'me' },
  { label: t('crmPipeline.unassigned'), value: 'unassigned' },
  ...users.value.map(user => ({
    label: user.name,
    value: String(user.id)
  }))
]))

const typeItems = computed(() => withSelectAll(
  t('crmPipeline.typeAll'),
  TYPES.map(item => ({
    label: t(`crmPipeline.types.${item}`),
    value: item
  }))
))

const stageItems = computed(() => withSelectAll(
  t('deals.stageAll'),
  STAGES.map(item => ({
    label: t(`deals.stages.${item}`),
    value: item
  }))
))

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    q.value = value.trim()
  }, SEARCH_DEBOUNCE_MS)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})

onMounted(() => {
  void request('/api/rms/users?per_page=100').then((page) => {
    users.value = (page as Paginated<UserListItem>).data
  }).catch(() => {
    users.value = []
  })
})

function selectView(id: DealViewId): void {
  void router.replace({ query: { ...route.query, view: id } })
}

function onKpis(value: PipelineKpis): void {
  kpis.value = value
}

async function loadTableKpis(): Promise<void> {
  const params = new URLSearchParams()

  if (owner.value !== SELECT_ALL) {
    params.set('owner', owner.value)
  }

  if (dealType.value !== SELECT_ALL) {
    params.set('type', dealType.value)
  }

  if (q.value.trim() !== '') {
    params.set('q', q.value.trim())
  }

  const query = params.toString()

  try {
    const payload = await request(query === '' ? '/api/crm/pipeline' : `/api/crm/pipeline?${query}`) as {
      meta: { kpis: PipelineKpis }
    }
    kpis.value = payload.meta.kpis
  } catch {
    kpis.value = emptyKpis
  }
}

watch(
  () => [owner.value, dealType.value, q.value, revision.value, view.value] as const,
  () => {
    if (view.value === 'table') {
      void loadTableKpis()
    }
  },
  { immediate: true }
)

function openDeal(id: number): void {
  drawerId.value = id
  drawerOpen.value = true
}

function changed(): void {
  revision.value += 1
}
</script>

<template>
  <div>
    <div class="krow">
      <AnkKpi
        :label="t('crmPipeline.kpiCollected')"
        :sub="t('crmPipeline.kpiCollectedSub')"
      >
        {{ format(kpis.collected) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiScheduled')"
        :sub="t('crmPipeline.kpiScheduledSub')"
      >
        {{ format(kpis.scheduled_in) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiAwaiting')"
        :sub="t('crmPipeline.kpiAwaitingSub')"
      >
        {{ format(kpis.awaiting_first_payment) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiOpen')"
        :sub="t('crmPipeline.kpiOpenSub', { count: String(kpis.open_pipeline_count) })"
      >
        {{ format(kpis.open_pipeline_value) }}
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiWeighted')"
        :sub="t('crmPipeline.kpiWeightedSub')"
      >
        <span class="crm-kpi-alert">{{ format(kpis.weighted_forecast) }}</span>
      </AnkKpi>
      <AnkKpi
        :label="t('crmPipeline.kpiOverdue')"
        :sub="t('crmPipeline.kpiOverdueSub')"
      >
        <span class="crm-kpi-alert">{{ format(kpis.overdue) }}</span>
      </AnkKpi>
    </div>

    <div class="panel">
      <div class="deals-head">
        <h3>{{ t('deals.title') }}</h3>
        <div class="deals-head-side">
          <div
            class="deals-views"
            role="group"
            :aria-label="t('deals.viewsAria')"
          >
            <button
              type="button"
              class="fchip"
              :class="{ on: view === 'table' }"
              :aria-pressed="view === 'table'"
              :aria-label="t('deals.viewTable')"
              @click="selectView('table')"
            >
              <UIcon
                name="i-lucide-list"
                class="deals-view-icon"
              />
            </button>
            <button
              type="button"
              class="fchip"
              :class="{ on: view === 'board' }"
              :aria-pressed="view === 'board'"
              :aria-label="t('deals.viewBoard')"
              @click="selectView('board')"
            >
              <UIcon
                name="i-lucide-kanban"
                class="deals-view-icon"
              />
            </button>
          </div>
          <UButton
            v-if="canMove"
            @click="newOpen = true"
          >
            {{ t('crmPipeline.newDeal') }}
          </UButton>
        </div>
      </div>
      <div class="deals-filters">
        <USelect
          v-model="owner"
          size="sm"
          :items="ownerItems"
        />
        <USelect
          v-model="dealType"
          size="sm"
          :items="typeItems"
        />
        <USelect
          v-if="view === 'table'"
          v-model="stage"
          size="sm"
          :items="stageItems"
        />
        <input
          v-model="searchInput"
          class="deals-search"
          type="search"
          :placeholder="t('crmPipeline.search')"
          :aria-label="t('crmPipeline.search')"
        >
      </div>

      <DealsTable
        v-if="view === 'table'"
        :owner="owner"
        :deal-type="dealType"
        :q="q"
        :stage="stage"
        :revision="revision"
        @open="openDeal"
      />
      <DealsBoard
        v-else
        :owner="owner"
        :deal-type="dealType"
        :q="q"
        :revision="revision"
        @open="openDeal"
        @kpis="onKpis"
      />
    </div>

    <DealDrawer
      v-model:open="drawerOpen"
      :deal-id="drawerId"
      :revision="revision"
      @changed="changed"
    />
    <NewDealModal
      v-model:open="newOpen"
      @created="changed"
    />
  </div>
</template>
