<script setup lang="ts">
import { linesToList } from '../../utils/linesToList'
import {
  COPY_CHAR_LIMIT,
  HEADLINE_LIMIT,
  ITINERARY_LABEL_LIMIT,
  useEngineSettingsDraft,
  type EnginePanelAccess
} from './engineSettingsHelpers'

const props = defineProps<EnginePanelAccess>()

const draft = useEngineSettingsDraft()
const { t } = useI18n()

const contextsText = ref('')

watch(
  () => draft.value,
  (doc) => {
    contextsText.value = doc.charter.group_contexts.join('\n')
  },
  { immediate: true }
)

function onContextsInput(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }

  contextsText.value = target.value
  draft.value.charter.group_contexts = linesToList(target.value)
}
</script>

<template>
  <AnkPanel :title="t('engineSettings.charterTitle')">
    <template #actions>
      <AnkPill>{{ t('engineSettings.adminManager') }}</AnkPill>
    </template>

    <div class="setgrid">
      <div>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.headline')"
          :count="draft.charter.headline.length"
          :max="HEADLINE_LIMIT"
        >
          <input
            :id="id"
            v-model="draft.charter.headline"
            type="text"
            :maxlength="HEADLINE_LIMIT"
            :disabled="!props.canEdit('charter.headline')"
            :class="{ bad: props.errorsFor('charter.headline').length > 0 }"
          >
        </EngineField>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.intro')"
          :count="draft.charter.intro.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            :id="id"
            v-model="draft.charter.intro"
            rows="4"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('charter.intro')"
            :class="{ bad: props.errorsFor('charter.intro').length > 0 }"
          />
        </EngineField>
        <div class="cols2">
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.itineraryLabel')"
            :count="draft.charter.itinerary_label.length"
            :max="ITINERARY_LABEL_LIMIT"
          >
            <input
              :id="id"
              v-model="draft.charter.itinerary_label"
              type="text"
              :maxlength="ITINERARY_LABEL_LIMIT"
              :disabled="!props.canEdit('charter.itinerary_label')"
              :class="{ bad: props.errorsFor('charter.itinerary_label').length > 0 }"
            >
          </EngineField>
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.responseSla')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.charter.response_sla_hours"
              variant="field"
              :disabled="!props.canEdit('charter.response_sla_hours')"
              :bad="props.errorsFor('charter.response_sla_hours').length > 0"
              min="1"
              max="72"
              step="1"
            />
          </EngineField>
        </div>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.groupContexts')"
        >
          <textarea
            :id="id"
            :value="contextsText"
            rows="4"
            :disabled="!props.canEdit('charter.group_contexts')"
            :class="{ bad: props.errorsFor('charter.group_contexts').length > 0 }"
            @input="onContextsInput"
          />
        </EngineField>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.thankYou')"
          :count="draft.charter.thank_you.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            :id="id"
            v-model="draft.charter.thank_you"
            rows="3"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('charter.thank_you')"
            :class="{ bad: props.errorsFor('charter.thank_you').length > 0 }"
          />
        </EngineField>
        <p class="engine-note">
          {{ t('engineSettings.charterNote') }}
        </p>
      </div>
      <EnginePreviewBox :label="t('engineSettings.prevCharter')" />
    </div>
  </AnkPanel>
</template>
