<script setup lang="ts">
import type { ChangeHistoryEntry } from '../../types/api'
import { describeHistory, type PermissionLabel } from './describe'

defineProps<{
  entries: Array<ChangeHistoryEntry>
  permissionLabel?: PermissionLabel
}>()

const { t } = useI18n()
const { format } = useDates()

type HistoryPart = { kind: 'text', text: string } | { kind: 'arrow' }

function historyParts(text: string): Array<HistoryPart> {
  const chunks = text.split('→')
  const parts: Array<HistoryPart> = []

  chunks.forEach((chunk, index) => {
    const textPart = chunk.trim()

    if (textPart !== '') {
      parts.push({ kind: 'text', text: textPart })
    }

    if (index < chunks.length - 1) {
      parts.push({ kind: 'arrow' })
    }
  })

  return parts
}
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
      <div class="tl-line">
        <template
          v-for="(part, index) in historyParts(describeHistory(entry, t, permissionLabel))"
          :key="index"
        >
          <UIcon
            v-if="part.kind === 'arrow'"
            name="i-lucide-arrow-right"
            class="tl-arrow"
          />
          <span v-else>{{ part.text }}</span>
        </template>
      </div>
      <div
        v-if="entry.reason"
        class="tlw"
      >
        {{ t('history.reason', { reason: entry.reason }) }}
      </div>
    </div>
  </div>
</template>
