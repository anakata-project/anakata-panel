<script setup lang="ts">
import EngineMapNoteLine from '../../../components/engine-map/EngineMapNoteLine.vue'
import {
  engineMapCounts,
  engineMapDecisions,
  engineMapMissingIsGap,
  engineMapOpen,
  engineMapPillClass,
  engineMapPillKey,
  engineMapRows
} from '../../../components/engine-map/catalogue'

const { t } = useI18n()

const counts = engineMapCounts(engineMapRows)
const missingIsGap = engineMapMissingIsGap(counts.notYet)

function pillLabel(source: typeof engineMapRows[number]['source']): string {
  const key = engineMapPillKey(source)

  return key === null ? source : t(key)
}
</script>

<template>
  <div>
    <div class="krow">
      <AnkKpi
        :label="t('engineMap.kpiMapped')"
        :sub="t('engineMap.kpiMappedSub')"
      >
        {{ counts.mapped }}
      </AnkKpi>
      <AnkKpi
        :label="t('engineMap.kpiNew')"
        :sub="t('engineMap.kpiNewSub')"
      >
        <span class="emap-kpi-ok">{{ counts.fedByNew }}</span>
      </AnkKpi>
      <AnkKpi
        :label="t('engineMap.kpiExisting')"
        :sub="t('engineMap.kpiExistingSub')"
      >
        {{ counts.fedByExisting }}
      </AnkKpi>
      <AnkKpi
        :label="t('engineMap.kpiMissing')"
        :sub="missingIsGap ? t('engineMap.kpiMissingGap') : t('engineMap.kpiMissingHome')"
      >
        <span :class="missingIsGap ? 'emap-kpi-gap' : 'emap-kpi-ok'">{{ counts.notYet }}</span>
      </AnkKpi>
    </div>

    <div class="panel">
      <h3>{{ t('engineMap.tableTitle') }}</h3>
      <div class="emap-scroll">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('engineMap.colStep') }}</th>
              <th>{{ t('engineMap.colElement') }}</th>
              <th>{{ t('engineMap.colSource') }}</th>
              <th>{{ t('engineMap.colStatus') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in engineMapRows"
              :key="row.id"
            >
              <td class="mono emap-step">
                {{ t(`engineMap.rows.${row.id}.step`) }}
              </td>
              <td>{{ t(`engineMap.rows.${row.id}.element`) }}</td>
              <td>{{ t(`engineMap.rows.${row.id}.source`) }}</td>
              <td class="nw">
                <span
                  class="pill"
                  :class="engineMapPillClass(row.source)"
                >{{ pillLabel(row.source) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel conflicts">
      <h3>{{ t('engineMap.decisionsTitle') }}</h3>
      <div class="emap-copy">
        <ul>
          <li
            v-for="note in engineMapDecisions"
            :key="note.id"
          >
            <EngineMapNoteLine
              group="decisions"
              :note="note"
            />
          </li>
        </ul>
      </div>
    </div>

    <div class="panel conflicts">
      <h3>{{ t('engineMap.openTitle') }}</h3>
      <div class="emap-copy">
        <ul>
          <li
            v-for="note in engineMapOpen"
            :key="note.id"
          >
            <EngineMapNoteLine
              group="open"
              :note="note"
            />
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
