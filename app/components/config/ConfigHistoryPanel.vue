<script setup lang="ts">
import type { ConfigVersionSummary } from '../../types/api'
import type { ConfigValueFormat } from '../../utils/formatConfigValue'
import { flattenConfigHistory } from '../../utils/configHistory'
import { formatConfigValue } from '../../utils/formatConfigValue'

const props = defineProps<{
  title: string
  emptyText: string
  versions: Array<ConfigVersionSummary>
  hasMore: boolean
  loading: boolean
  formats?: Record<string, ConfigValueFormat>
}>()

const emit = defineEmits<{
  loadOlder: []
}>()

const { t } = useI18n()
const { format } = useDates()

const rows = computed(() => flattenConfigHistory(props.versions, {
  system: t('config.system'),
  initialValues: t('config.initialValues')
}))
</script>

<template>
  <AnkPanel :title="title">
    <div class="config-history-scroll">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('config.when') }}</th>
            <th>{{ t('config.who') }}</th>
            <th>{{ t('config.item') }}</th>
            <th>{{ t('config.change') }}</th>
            <th>{{ t('config.approval') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="rows.length === 0"
            class="dr-empty"
          >
            <td colspan="5">
              {{ emptyText }}
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.key"
          >
            <td class="mono nw">
              {{ format(row.publishedAt, 'dateTime') }}
            </td>
            <td>{{ row.who }}</td>
            <td>{{ row.item }}</td>
            <td
              v-if="row.path === ''"
              class="config-change-from"
            >
              —
            </td>
            <td
              v-else
              class="nw config-change-from"
            >
              {{ formatConfigValue(row.path, row.from, formats) }}
              →
              <span class="config-change-to">{{ formatConfigValue(row.path, row.to, formats) }}</span>
            </td>
            <td class="config-change-from">
              {{ row.approval ?? '—' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <button
      v-if="hasMore"
      type="button"
      class="history-load"
      :disabled="loading"
      @click="emit('loadOlder')"
    >
      {{ t('history.loadOlder') }}
    </button>
  </AnkPanel>
</template>
