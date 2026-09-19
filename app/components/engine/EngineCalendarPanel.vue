<script setup lang="ts">
import { useEngineSettingsDraft, type EnginePanelAccess } from './engineSettingsHelpers'

const props = defineProps<EnginePanelAccess>()

const draft = useEngineSettingsDraft()
const { t } = useI18n()
</script>

<template>
  <AnkPanel :title="t('engineSettings.calendarTitle')">
    <template #actions>
      <AnkPill>{{ t('engineSettings.admin') }}</AnkPill>
    </template>

    <div class="setgrid">
      <div>
        <EngineField :label="t('engineSettings.firstBookable')">
          <div class="roval">
            {{ t('engineSettings.firstBookableValue') }}
          </div>
        </EngineField>
        <div class="cols2">
          <EngineField :label="t('engineSettings.searchFrom')">
            <input
              v-model="draft.calendar.default_search_from"
              type="month"
              :disabled="!props.canEdit('calendar.default_search_from')"
              :class="{ bad: props.errorsFor('calendar.default_search_from').length > 0 }"
            >
          </EngineField>
          <EngineField :label="t('engineSettings.searchTo')">
            <input
              v-model="draft.calendar.default_search_to"
              type="month"
              :disabled="!props.canEdit('calendar.default_search_to')"
              :class="{ bad: props.errorsFor('calendar.default_search_to').length > 0 }"
            >
          </EngineField>
        </div>
        <div class="cols2">
          <EngineField :label="t('engineSettings.defaultAdults')">
            <ConfigNumberInput
              v-model="draft.calendar.default_adults"
              variant="field"
              :disabled="!props.canEdit('calendar.default_adults')"
              :bad="props.errorsFor('calendar.default_adults').length > 0"
              min="1"
              max="16"
              step="1"
            />
          </EngineField>
          <EngineField :label="t('engineSettings.horizon')">
            <ConfigNumberInput
              v-model="draft.calendar.horizon_months"
              variant="field"
              :disabled="!props.canEdit('calendar.horizon_months')"
              :bad="props.errorsFor('calendar.horizon_months').length > 0"
              min="6"
              max="36"
              step="1"
            />
          </EngineField>
        </div>
      </div>
      <EnginePreviewBox :label="t('engineSettings.prevCalendar')" />
    </div>
  </AnkPanel>
</template>
