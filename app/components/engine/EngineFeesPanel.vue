<script setup lang="ts">
import { COPY_CHAR_LIMIT, useEngineSettingsDraft, type EnginePanelAccess } from './engineSettingsHelpers'

const props = defineProps<EnginePanelAccess>()

const draft = useEngineSettingsDraft()
const { t } = useI18n()
</script>

<template>
  <AnkPanel :title="t('engineSettings.feesTitle')">
    <template #actions>
      <AnkPill>{{ t('engineSettings.admin') }}</AnkPill>
    </template>

    <div class="setgrid">
      <div>
        <div class="cols2">
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.tct')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.tct_pp"
              variant="field"
              :disabled="!props.canEdit('fees.tct_pp')"
              :bad="props.errorsFor('fees.tct_pp').length > 0"
              min="0"
              step="1"
            />
          </EngineField>
          <div />
        </div>
        <div class="cols2">
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.pngForeignOver12')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.png.foreign_over_12"
              variant="field"
              :disabled="!props.canEdit('fees.png.foreign_over_12')"
              :bad="props.errorsFor('fees.png.foreign_over_12').length > 0"
              min="0"
              step="1"
            />
          </EngineField>
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.pngForeignUnder12')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.png.foreign_12_and_under"
              variant="field"
              :disabled="!props.canEdit('fees.png.foreign_12_and_under')"
              :bad="props.errorsFor('fees.png.foreign_12_and_under').length > 0"
              min="0"
              step="1"
            />
          </EngineField>
        </div>
        <div class="cols2">
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.pngCanAdult')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.png.can_adult"
              variant="field"
              :disabled="!props.canEdit('fees.png.can_adult')"
              :bad="props.errorsFor('fees.png.can_adult').length > 0"
              min="0"
              step="1"
            />
          </EngineField>
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.pngCanMinor')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.png.can_minor"
              variant="field"
              :disabled="!props.canEdit('fees.png.can_minor')"
              :bad="props.errorsFor('fees.png.can_minor').length > 0"
              min="0"
              step="1"
            />
          </EngineField>
        </div>
        <div class="cols2">
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.pngNational')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.png.national_or_resident"
              variant="field"
              :disabled="!props.canEdit('fees.png.national_or_resident')"
              :bad="props.errorsFor('fees.png.national_or_resident').length > 0"
              min="0"
              step="1"
            />
          </EngineField>
          <EngineField
            v-slot="{ id }"
            :label="t('engineSettings.pngExempt')"
          >
            <ConfigNumberInput
              :id="id"
              v-model="draft.fees.png.exempt_under_age"
              variant="field"
              :disabled="!props.canEdit('fees.png.exempt_under_age')"
              :bad="props.errorsFor('fees.png.exempt_under_age').length > 0"
              min="0"
              max="12"
              step="1"
            />
          </EngineField>
        </div>
        <label class="chkline">
          <input
            v-model="draft.fees.show_in_price_panel"
            type="checkbox"
            :disabled="!props.canEdit('fees.show_in_price_panel')"
          >
          {{ t('engineSettings.showFees') }}
        </label>
        <EngineField
          v-slot="{ id }"
          :label="t('engineSettings.feeNote')"
          :count="draft.fees.footnote.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            :id="id"
            v-model="draft.fees.footnote"
            rows="2"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('fees.footnote')"
            :class="{ bad: props.errorsFor('fees.footnote').length > 0 }"
          />
        </EngineField>
        <p class="engine-note">
          {{ t('engineSettings.feesFootnote') }}
        </p>
      </div>
      <EnginePreviewBox :label="t('engineSettings.prevFees')" />
    </div>
  </AnkPanel>
</template>
