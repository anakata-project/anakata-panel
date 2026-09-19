<script setup lang="ts">
import type { ConfigEditorApi } from '../../composables/useConfigEditor'
import type { ConfigValueFormat } from '../../utils/formatConfigValue'
import { formatConfigValue } from '../../utils/formatConfigValue'

const props = defineProps<{
  editor: ConfigEditorApi<unknown>
  canPublish: boolean
  approvalRequired: boolean
  readOnlyText: string
  confirmNote: string
  formats?: Record<string, ConfigValueFormat>
}>()

const { t } = useI18n()
const { format } = useDates()

const approval = ref('')
const approvalBad = ref(false)
const confirmOpen = ref(false)

const hasErrors = computed(() => props.editor.hasErrors)

const saveDisabled = computed(() => {
  return !props.canPublish
    || !props.editor.dirty
    || hasErrors.value
    || props.editor.validating
})

const discardDisabled = computed(() => {
  return !props.canPublish || !props.editor.dirty
})

const stateClass = computed(() => {
  if (!props.canPublish) {
    return 'esbar-state--ro'
  }

  if (props.editor.dirty) {
    return 'esbar-state--warn'
  }

  return 'esbar-state--ok'
})

const stateText = computed(() => {
  if (!props.canPublish) {
    return props.readOnlyText
  }

  if (props.editor.dirty && hasErrors.value) {
    return t('config.unsaved')
  }

  if (props.editor.dirty) {
    const count = props.editor.validation.changes.length

    return count === 1
      ? t('config.unsavedCountOne')
      : t('config.unsavedCount', { n: String(count) })
  }

  const current = props.editor.current
  const version = current?.version ?? 0
  const when = format(current?.published_at, 'dateTime')
  const who = current?.published_by?.name ?? t('config.system')

  return t('config.publishedLine', {
    version: String(version),
    date: when,
    name: who
  })
})

const errorLines = computed(() => {
  const errors = props.editor.validation.errors
  const changes = props.editor.validation.changes

  return Object.entries(errors).flatMap(([path, messages]) => {
    const label = changes.find(change => change.path === path)?.label ?? path

    return messages.map(message => `${label}: ${message}`)
  })
})

const warnboxVisible = computed(() => {
  return errorLines.value.length > 0
    || props.editor.validation.warnings.length > 0
    || Boolean(props.editor.conflict)
    || Boolean(props.editor.publishMessage)
})

function labelFor(path: string, fallback: string): string {
  return props.editor.validation.changes.find(change => change.path === path)?.label ?? fallback
}

function requestPublish(): void {
  approvalBad.value = false

  if (props.approvalRequired && approval.value.trim() === '') {
    approvalBad.value = true
    return
  }

  confirmOpen.value = true
}

async function confirmPublish(): Promise<void> {
  confirmOpen.value = false
  await props.editor.publish(approval.value)
}

function loadLatest(): void {
  if (!window.confirm(t('config.loadLatestConfirm'))) {
    return
  }

  props.editor.discard()
  void props.editor.reload().then(() => props.editor.reloadHistory())
}
</script>

<template>
  <div>
    <div class="esbar">
      <span
        class="mono"
        :class="stateClass"
      >{{ stateText }}</span>
      <div class="acts">
        <input
          v-model="approval"
          class="rreason"
          :class="{ bad: approvalBad }"
          :placeholder="approvalRequired ? t('config.approvalRequired') : t('config.approvalOptional')"
          :disabled="!canPublish"
        >
        <UButton
          variant="outline"
          :disabled="discardDisabled"
          @click="editor.discard()"
        >
          {{ t('config.discard') }}
        </UButton>
        <UButton
          :disabled="saveDisabled"
          @click="requestPublish"
        >
          {{ t('config.savePublish') }}
        </UButton>
      </div>
    </div>

    <div
      v-if="warnboxVisible"
      class="warnbox esbar-warn"
    >
      <div
        v-for="line in errorLines"
        :key="line"
      >
        ✕ {{ line }}
      </div>
      <div
        v-for="warning in editor.validation.warnings"
        :key="`${warning.path}:${warning.message}`"
      >
        ⚠ {{ warning.message }}
      </div>
      <div v-if="editor.publishMessage">
        {{ editor.publishMessage }}
      </div>
      <div v-if="editor.conflict">
        {{ editor.conflict }}
        <button
          type="button"
          class="mini"
          @click="loadLatest"
        >
          {{ t('config.loadLatest') }}
        </button>
      </div>
    </div>

    <UModal
      :open="confirmOpen"
      :title="t('config.confirmTitle')"
      @update:open="confirmOpen = $event"
    >
      <template #body>
        <ul class="config-change-list">
          <li
            v-for="change in editor.validation.changes"
            :key="change.path"
          >
            {{ labelFor(change.path, change.label) }}:
            {{ formatConfigValue(change.path, change.from, formats) }}
            →
            <span class="config-change-to">{{ formatConfigValue(change.path, change.to, formats) }}</span>
          </li>
        </ul>
        <p class="config-confirm-note">
          {{ confirmNote }}
        </p>
        <div class="modal-actions">
          <UButton
            variant="outline"
            @click="confirmOpen = false"
          >
            {{ t('admin.cancel') }}
          </UButton>
          <UButton @click="confirmPublish">
            {{ t('config.savePublish') }}
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
