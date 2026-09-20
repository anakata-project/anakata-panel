<script setup lang="ts">
import type { InternalBlock, Yacht } from '../../../types/api'
import DateRangeFilter from '../../../components/lists/DateRangeFilter.vue'
import BlockDrawer from '../../../components/blocks/BlockDrawer.vue'
import NewBlockModal from '../../../components/blocks/NewBlockModal.vue'
import ReleaseBlockModal from '../../../components/blocks/ReleaseBlockModal.vue'
import {
  blockToOpen,
  STATUS_LABEL_KEYS,
  type BlockListStatus
} from '../../../components/blocks/blockHelpers'

const STATUSES: Array<BlockListStatus> = ['active', 'released', 'all']

const { can, user } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format } = useDates()
const route = useRoute()

const from = ref<string | null>(null)
const to = ref<string | null>(null)
const status = ref<BlockListStatus>('active')
const drawerOpen = ref(false)
const createOpen = ref(false)
const releaseOpen = ref(false)
const selected = ref<InternalBlock | null>(null)
const releasing = ref<InternalBlock | null>(null)
const openedFromQuery = ref(false)
const today = computed(() => format(new Date(), 'iso'))

const canManage = computed(() => can('blocks.manage'))
const roleName = computed(() => user.value?.role.name ?? '')

const { data: yachtsPayload } = useFetch<{ data: Array<Yacht> }>('/api/rms/yachts')
const yachts = computed(() => yachtsPayload.value?.data ?? [])

const listUrl = computed(() => {
  const params = new URLSearchParams({ status: status.value })

  if (from.value !== null) {
    params.set('from', from.value)
  }

  if (to.value !== null) {
    params.set('to', to.value)
  }

  return `/api/rms/blocks?${params.toString()}`
})

const { data: listPayload, refresh } = useFetch<{ data: Array<InternalBlock> }>(listUrl)

const blocks = computed(() => listPayload.value?.data ?? [])
const total = computed(() => blocks.value.length)

function actorName(block: InternalBlock): string {
  return block.created_by?.name ?? t('blocks.system')
}

function openDrawer(block: InternalBlock): void {
  selected.value = block
  drawerOpen.value = true
}

function openRelease(block: InternalBlock, event: Event): void {
  event.stopPropagation()
  releasing.value = block
  releaseOpen.value = true
}

async function onSaved(block: InternalBlock): Promise<void> {
  await refresh()
  selected.value = blocks.value.find(item => item.id === block.id) ?? block
}

async function onCreated(): Promise<void> {
  await refresh()
}

async function onReleased(): Promise<void> {
  await refresh()
}

watch(
  [listPayload, () => route.query.open],
  async ([payload, open]) => {
    if (openedFromQuery.value || payload === undefined) {
      return
    }

    const fromList = blockToOpen(open as string | Array<string> | undefined, payload.data)

    if (fromList !== null) {
      openDrawer(fromList)
      openedFromQuery.value = true
      return
    }

    const reference = Array.isArray(open) ? open[0] : open

    if (typeof reference !== 'string' || reference === '') {
      openedFromQuery.value = true
      return
    }

    const all = await request('/api/rms/blocks?status=all') as { data: Array<InternalBlock> }
    const found = blockToOpen(reference, all.data)

    if (found !== null) {
      openDrawer(found)
    }

    openedFromQuery.value = true
  }
)
</script>

<template>
  <div>
    <DateRangeFilter
      v-model:from="from"
      v-model:to="to"
      :field-label="t('blocks.fieldLabel')"
      :noun="t('blocks.noun')"
      :total="total"
      :today="today"
    />

    <div class="panel">
      <h3>{{ t('blocks.panelTitle') }}</h3>
      <div class="ebtool dep-toolbar">
        <div class="fchips">
          <button
            v-for="item in STATUSES"
            :key="item"
            type="button"
            class="fchip"
            :class="{ on: status === item }"
            @click="status = item"
          >
            {{ t(STATUS_LABEL_KEYS[item]) }}
          </button>
        </div>
      </div>
      <div class="dep-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('blocks.colScope') }}</th>
              <th>{{ t('blocks.colReason') }}</th>
              <th>{{ t('blocks.colCreatedBy') }}</th>
              <th>{{ t('blocks.colNotes') }}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="blocks.length === 0"
              class="dr-empty"
            >
              <td colspan="5">
                {{ t('blocks.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in blocks"
              :key="row.id"
              class="dep-row"
              @click="openDrawer(row)"
            >
              <td>{{ row.scope_summary }}</td>
              <td>
                <span class="pill">{{ row.reason_label }}</span>
              </td>
              <td>{{ actorName(row) }}</td>
              <td>{{ row.notes }}</td>
              <td class="list-actions">
                <UButton
                  v-if="canManage && row.released_at === null"
                  variant="outline"
                  @click="openRelease(row, $event)"
                >
                  {{ t('blocks.release') }}
                </UButton>
                <span
                  v-else-if="row.released_at"
                  class="blk-released"
                >
                  {{ t('blocks.releasedBy', {
                    date: format(row.released_at, 'short'),
                    name: row.released_by?.name ?? t('blocks.system')
                  }) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <UButton
      v-if="canManage"
      class="blk-new"
      variant="outline"
      @click="createOpen = true"
    >
      {{ t('blocks.new') }}
    </UButton>

    <BlockDrawer
      v-model:open="drawerOpen"
      :source="selected"
      :can-manage="canManage"
      :role-name="roleName"
      @saved="onSaved"
    />

    <NewBlockModal
      v-model:open="createOpen"
      :yachts="yachts"
      :from="from"
      :to="to"
      :today="today"
      @created="onCreated"
    />

    <ReleaseBlockModal
      v-model:open="releaseOpen"
      :block="releasing"
      @released="onReleased"
    />
  </div>
</template>
