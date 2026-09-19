<script setup lang="ts">
import type { RuleRegistryRow } from '../../types/api'
import {
  resetRow,
  rowDiffers,
  ruleLinkKey,
  RULES_DRAFT_KEY,
  statusPill
} from './rulesHelpers'

defineProps<{
  title: string
  rows: Array<RuleRegistryRow>
  canEdit: boolean
  errorsFor: (path: string) => Array<string>
}>()

const injected = inject(RULES_DRAFT_KEY)

if (injected === undefined) {
  throw new Error('RulesGroupPanel requires a provided business-rules draft')
}

const draft = computed(() => {
  const value = injected.value

  if (value === null) {
    throw new Error('RulesGroupPanel requires a business-rules draft')
  }

  return value
})

const { t } = useI18n()

function differs(row: RuleRegistryRow): boolean {
  return rowDiffers(row, draft.value)
}

function onReset(row: RuleRegistryRow): void {
  resetRow(draft.value, row)
}

function linkLabel(row: RuleRegistryRow): string | null {
  const key = ruleLinkKey(row.where)

  return key === null ? null : t(`businessRules.${key}`)
}

function pill(row: RuleRegistryRow): { tone: ReturnType<typeof statusPill>['tone'], label: string } {
  const mapped = statusPill(row.status)

  return {
    tone: mapped.tone,
    label: t(mapped.labelKey)
  }
}
</script>

<template>
  <AnkPanel :title="title">
    <div class="rules-scroll">
      <table class="list rtab">
        <thead>
          <tr>
            <th>{{ t('businessRules.colSource') }}</th>
            <th>{{ t('businessRules.colRule') }}</th>
            <th>{{ t('businessRules.colCurrent') }}</th>
            <th>{{ t('businessRules.colSourceValue') }}</th>
            <th>{{ t('businessRules.colUsed') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.key"
            :class="{ rdiff: differs(row) }"
          >
            <td class="nw">
              <span class="mono rule-code">{{ row.source_code }}</span>
              <br>
              <AnkPill
                class="rule-pill"
                :tone="pill(row).tone"
              >
                {{ pill(row).label }}
              </AnkPill>
            </td>
            <td>
              {{ row.name }}
              <div
                v-if="row.note"
                class="rflag"
              >
                ⚠ {{ row.note }}
              </div>
            </td>
            <td>
              <RulesCurrentCell
                :row="row"
                :can-edit="canEdit"
                :errors-for="errorsFor"
              />
            </td>
            <td class="rule-source">
              <span
                v-if="row.source_display === 'not in v5'"
                class="mono rule-source-empty"
              >{{ t('businessRules.notInV5') }}</span>
              <template v-else>
                {{ row.source_display }}
              </template>
            </td>
            <td class="rule-used">
              {{ row.used_in }}
            </td>
            <td class="nw">
              <NuxtLink
                v-if="row.link && linkLabel(row)"
                class="lnk"
                :to="row.link"
              >
                {{ linkLabel(row) }}
              </NuxtLink>
              <button
                v-else-if="canEdit && row.where === 'here' && differs(row)"
                type="button"
                class="mini"
                @click="onReset(row)"
              >
                {{ t('businessRules.reset') }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </AnkPanel>
</template>
