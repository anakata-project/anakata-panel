<script setup lang="ts">
import { COPY_CHAR_LIMIT, useEngineSettingsDraft, type EnginePanelAccess } from './engineSettingsHelpers'

const props = defineProps<EnginePanelAccess>()

const draft = useEngineSettingsDraft()
const { t } = useI18n()
</script>

<template>
  <AnkPanel :title="t('engineSettings.copyTitle')">
    <template #actions>
      <AnkPill>{{ t('engineSettings.adminManager') }}</AnkPill>
    </template>

    <div class="setgrid">
      <div>
        <EngineField
          :label="t('engineSettings.noteBnpl')"
          :count="draft.copy.book_now_pay_later.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            v-model="draft.copy.book_now_pay_later"
            rows="3"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.book_now_pay_later')"
            :class="{ bad: props.errorsFor('copy.book_now_pay_later').length > 0 }"
          />
        </EngineField>
        <EngineField
          :label="t('engineSettings.noteChild')"
          :count="draft.copy.traveling_with_children.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            v-model="draft.copy.traveling_with_children"
            rows="3"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.traveling_with_children')"
            :class="{ bad: props.errorsFor('copy.traveling_with_children').length > 0 }"
          />
        </EngineField>
        <EngineField
          :label="t('engineSettings.noteSolo')"
          :count="draft.copy.solo_and_triple.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            v-model="draft.copy.solo_and_triple"
            rows="2"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.solo_and_triple')"
            :class="{ bad: props.errorsFor('copy.solo_and_triple').length > 0 }"
          />
        </EngineField>
        <EngineField
          :label="t('engineSettings.payToday')"
          :count="draft.copy.pay_today.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            v-model="draft.copy.pay_today"
            rows="3"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.pay_today')"
            :class="{ bad: props.errorsFor('copy.pay_today').length > 0 }"
          />
        </EngineField>
        <EngineField
          :label="t('engineSettings.noteDetails')"
          :count="draft.copy.details_note.length"
          :max="COPY_CHAR_LIMIT"
        >
          <textarea
            v-model="draft.copy.details_note"
            rows="4"
            :maxlength="COPY_CHAR_LIMIT"
            :disabled="!props.canEdit('copy.details_note')"
            :class="{ bad: props.errorsFor('copy.details_note').length > 0 }"
          />
        </EngineField>
      </div>
      <EnginePreviewBox :label="t('engineSettings.prevCopy')" />
    </div>
  </AnkPanel>
</template>
