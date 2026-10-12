<script setup lang="ts">
import type { DealListItem, DealStage, Paginated } from '../../types/api'
import { slaBadge } from '../crm/salesHelpers'

const props = defineProps<{
  owner: string
  dealType: string
  q: string
  stage: string
  revision: number
}>()

const emit = defineEmits<{
  open: [id: number]
}>()

const { t } = useI18n()
const { useFetch } = useApi()
const { format } = useMoney()

const page = ref(1)

watch(
  () => [props.owner, props.dealType, props.q, props.stage] as const,
  () => {
    page.value = 1
  }
)

const listUrl = computed(() => {
  const params = new URLSearchParams({
    page: String(page.value),
    per_page: '50'
  })

  if (props.owner !== 'all') {
    params.set('owner', props.owner)
  }

  if (props.dealType !== 'all') {
    params.set('type', props.dealType)
  }

  if (props.stage !== 'all') {
    params.set('stage', props.stage)
  }

  if (props.q.trim() !== '') {
    params.set('q', props.q.trim())
  }

  return `/api/crm/deals?${params.toString()}`
})

const { data: listPayload, refresh } = useFetch<Paginated<DealListItem>>(listUrl)

watch(() => props.revision, () => {
  void refresh()
})

const rows = computed(() => listPayload.value?.data ?? [])
const meta = computed(() => listPayload.value?.meta)

function stageLabel(row: DealListItem): string {
  const key = `deals.stages.${row.stage}`
  const label = t(key)

  return label === key ? row.stage_label : label
}

function bookingTo(reference: string): string {
  return `/rms/reservations/bookings?open=${encodeURIComponent(reference)}`
}

function isStage(value: string): value is DealStage {
  return value !== ''
}
</script>

<template>
  <div>
    <div class="bk-table-wrap">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('deals.colTitle') }}</th>
            <th>{{ t('deals.colContact') }}</th>
            <th>{{ t('deals.colType') }}</th>
            <th>{{ t('deals.colStage') }}</th>
            <th>{{ t('deals.colOwner') }}</th>
            <th>{{ t('deals.colValue') }}</th>
            <th>{{ t('deals.colBooking') }}</th>
            <th>{{ t('deals.colSla') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="rows.length === 0"
            class="dr-empty"
          >
            <td colspan="8">
              {{ t('deals.empty') }}
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.id"
            class="bk-row"
            @click="emit('open', row.id)"
          >
            <td>{{ row.title }}</td>
            <td>{{ row.contact.name }}</td>
            <td>{{ row.type }}</td>
            <td>{{ isStage(row.stage) ? stageLabel(row) : row.stage_label }}</td>
            <td>{{ row.owner?.name ?? t('crmPipeline.unassigned') }}</td>
            <td>{{ format(row.value) }}</td>
            <td>
              <NuxtLink
                v-if="row.booking"
                class="bk-ref"
                :to="bookingTo(row.booking.reference)"
                @click.stop
              >
                {{ row.booking.reference }}
              </NuxtLink>
              <span
                v-else
                class="bk-sub"
              >{{ t('crmPipeline.noRmsYet') }}</span>
            </td>
            <td>
              <span
                v-if="slaBadge(row.sla_state)"
                class="slabadge"
                :class="row.sla_state ?? 'ok'"
              >{{ slaBadge(row.sla_state) }}</span>
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
        {{ t('bookings.previous') }}
      </button>
      <span>{{ t('bookings.pager', { from: String(meta.from ?? 0), to: String(meta.to ?? 0), total: String(meta.total) }) }}</span>
      <button
        type="button"
        :disabled="meta.current_page >= meta.last_page"
        @click="page += 1"
      >
        {{ t('bookings.next') }}
      </button>
    </div>
  </div>
</template>
