<script setup lang="ts">
import { COPY_CHAR_LIMIT, useEngineSettingsDraft, type EnginePanelAccess } from './engineSettingsHelpers'

const props = defineProps<EnginePanelAccess>()

const draft = useEngineSettingsDraft()
const { t } = useI18n()

function step(index: number): string {
  return draft.value.copy.confirmation_steps[index] ?? ''
}

function setStep(index: number, value: string): void {
  const steps: Array<string> = [step(0), step(1), step(2)]
  steps[index] = value
  draft.value.copy.confirmation_steps = steps
}

function onStepInput(index: number, event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLTextAreaElement)) {
    return
  }

  setStep(index, target.value)
}
</script>

<template>
  <AnkPanel :title="t('engineSettings.confirmTitle')">
    <template #actions>
      <AnkPill>{{ t('engineSettings.adminManager') }}</AnkPill>
    </template>

    <div class="setgrid">
      <div>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.step1')"
          :count="step(0).length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            :id="id"
            :value="step(0)"
            rows="2"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.confirmation_steps')"
            :class="{ bad: props.errorsFor('copy.confirmation_steps').length > 0 }"
            @input="onStepInput(0, $event)"
          />
        </EngineField>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.step2')"
          :count="step(1).length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            :id="id"
            :value="step(1)"
            rows="2"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.confirmation_steps')"
            :class="{ bad: props.errorsFor('copy.confirmation_steps').length > 0 }"
            @input="onStepInput(1, $event)"
          />
        </EngineField>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.step3')"
          :count="step(2).length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            :id="id"
            :value="step(2)"
            rows="2"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.confirmation_steps')"
            :class="{ bad: props.errorsFor('copy.confirmation_steps').length > 0 }"
            @input="onStepInput(2, $event)"
          />
        </EngineField>
      </div>
      <EnginePreviewBox :label="t('engineSettings.prevConfirm')" />
    </div>
  </AnkPanel>
</template>
