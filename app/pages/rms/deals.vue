<script setup lang="ts">
import type { DealStage, DealType, Paginated, UserListItem } from '../../types/api'
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

const { t } = useI18n()
const { request } = useApi()
const { can } = useAuth()
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
    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('deals.title') }}</h3>
        <UButton
          v-if="canMove"
          @click="newOpen = true"
        >
          {{ t('crmPipeline.newDeal') }}
        </UButton>
      </div>
      <div class="ebtool dep-toolbar">
        <div
          class="fchips"
          role="group"
          :aria-label="t('deals.viewsAria')"
        >
          <button
            type="button"
            class="fchip"
            :class="{ on: view === 'table' }"
            :aria-pressed="view === 'table'"
            @click="selectView('table')"
          >
            {{ t('deals.viewTable') }}
          </button>
          <button
            type="button"
            class="fchip"
            :class="{ on: view === 'board' }"
            :aria-pressed="view === 'board'"
            @click="selectView('board')"
          >
            {{ t('deals.viewBoard') }}
          </button>
        </div>
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
          type="search"
          :placeholder="t('crmPipeline.search')"
          :aria-label="t('crmPipeline.search')"
        >
      </div>
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
    />

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
