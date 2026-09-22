<script setup lang="ts">
import type {
  GuestPreferences,
  GuestPreferencesInput,
  PreferenceQuestion,
  PreferenceSource
} from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  guestId: number | null
  name: string
  meta: string
}>()

const emit = defineEmits<{
  saved: []
}>()

const RESTRICTED_FIELD: Record<string, 'accessibility' | 'emergency_contact'> = {
  access: 'accessibility',
  emerg: 'emergency_contact'
}

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()

const canManage = computed(() => can('guest_experience.manage'))
const canSensitive = computed(() => can('guests.view_sensitive'))

const questions = ref<Array<PreferenceQuestion>>([])
const preferences = ref<GuestPreferences | null>(null)
const draft = ref<Record<string, string>>({})
const loading = ref(false)
const submitting = ref(false)
const error = ref('')

const versions = computed(() => [...(preferences.value?.versions ?? [])].reverse())

watch(open, (isOpen) => {
  if (isOpen) {
    void load()
  }
})

function sourceLabel(source: PreferenceSource): string {
  return source === 'GUEST_LINK'
    ? t('guestExperience.sourceGuest')
    : t('guestExperience.sourceStaff')
}

function restrictedField(key: string): 'accessibility' | 'emergency_contact' | null {
  return RESTRICTED_FIELD[key] ?? null
}

function fillDraft(): void {
  const current = preferences.value?.current
  const next: Record<string, string> = {}

  for (const question of questions.value) {
    const field = restrictedField(question.key)

    if (question.restricted && field !== null && canSensitive.value && current !== null && current !== undefined) {
      next[question.key] = current[field] ?? ''
    } else if (!question.restricted && current !== null && current !== undefined) {
      next[question.key] = current.answers[question.key] ?? ''
    } else {
      next[question.key] = ''
    }
  }

  draft.value = next
}

function versionLine(version: GuestPreferences['versions'][number]): string {
  const who = version.recorded_by?.name
  const when = version.answered_at === null ? '—' : format(version.answered_at, 'dateTime')
  const line = t('guestExperience.versionLine', {
    version: String(version.version),
    source: sourceLabel(version.source),
    who: who === undefined || who === null || who === '' ? '—' : who,
    when
  })

  return version.purged_at === null ? line : `${line} · ${t('guestExperience.purged')}`
}

async function load(): Promise<void> {
  if (props.guestId === null) {
    return
  }

  loading.value = true
  error.value = ''

  try {
    const [questionPayload, preferencePayload] = await Promise.all([
      request('/api/rms/guest-experience/questions') as Promise<{ data: Array<PreferenceQuestion> }>,
      request(`/api/rms/guests/${String(props.guestId)}/preferences`) as Promise<{ data: GuestPreferences }>
    ])
    questions.value = questionPayload.data
    preferences.value = preferencePayload.data
    fillDraft()
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('guestExperience.loadFailed')
  } finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (props.guestId === null || !canManage.value) {
    return
  }

  const answers: Record<string, string> = {}

  for (const question of questions.value) {
    if (question.restricted && !canSensitive.value) {
      continue
    }

    answers[question.key] = draft.value[question.key] ?? ''
  }

  const body: GuestPreferencesInput = { answers }
  submitting.value = true
  error.value = ''

  try {
    const payload = await request(`/api/rms/guests/${String(props.guestId)}/preferences`, {
      method: 'PUT',
      body
    }) as { data: GuestPreferences }
    preferences.value = payload.data
    fillDraft()
    emit('saved')
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('guestExperience.saveFailed')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('guestExperience.preferencesHeading')"
    :description="name"
    @update:open="open = $event"
  >
    <template #body>
      <p class="gmeta">
        {{ meta }}
      </p>
      <p
        v-if="loading"
        class="note"
      >
        {{ t('bookings.docPreviewLoading') }}
      </p>
      <form
        v-else
        class="modal-form"
        @submit.prevent="save"
      >
        <div
          v-if="error !== ''"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div
          v-for="question in questions"
          :key="question.key"
          class="field"
        >
          <label :for="`pref-${question.key}`">{{ question.label }}</label>
          <div
            v-if="question.restricted && !canSensitive"
            class="roval"
          >
            {{ t('guestExperience.restricted') }}
          </div>
          <select
            v-else-if="question.type === 'choice'"
            :id="`pref-${question.key}`"
            v-model="draft[question.key]"
            :disabled="!canManage"
          >
            <option value="">
              —
            </option>
            <option
              v-for="option in question.options"
              :key="option"
              :value="option"
            >
              {{ option }}
            </option>
          </select>
          <input
            v-else
            :id="`pref-${question.key}`"
            v-model="draft[question.key]"
            type="text"
            :disabled="!canManage"
          >
        </div>
        <p class="note">
          {{ t('guestExperience.wordingNote') }}
        </p>
        <div
          v-if="canManage"
          class="modal-actions"
        >
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ t('guestExperience.save') }}
          </UButton>
        </div>
        <div class="sec">
          <h4>{{ t('guestExperience.versions') }}</h4>
          <p
            v-if="versions.length === 0"
            class="note"
          >
            {{ t('guestExperience.versionsEmpty') }}
          </p>
          <p
            v-for="version in versions"
            :key="version.id"
            class="gmeta"
          >
            {{ versionLine(version) }}
          </p>
        </div>
      </form>
    </template>
  </UModal>
</template>
