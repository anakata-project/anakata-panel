<script setup lang="ts">
import type { ChangeHistoryEntry } from '../../types/api'
import { describeHistory, type PermissionLabel } from './describe'

defineProps<{
  entries: Array<ChangeHistoryEntry>
  permissionLabel?: PermissionLabel
}>()

const { t } = useI18n()
const { format } = useDates()
</script>

<template>
  <div class="tl2">
    <div
      v-for="entry in entries"
      :key="entry.id"
      class="tli"
    >
      <div class="tlt">
        {{ format(entry.at, 'dateTime') }} · {{ entry.actor_label }}
      </div>
      <div>{{ describeHistory(entry, t, permissionLabel) }}</div>
      <div
        v-if="entry.reason"
        class="tlw"
      >
        {{ t('history.reason', { reason: entry.reason }) }}
      </div>
    </div>
  </div>
</template>
