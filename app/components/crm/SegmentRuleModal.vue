<script setup lang="ts">
import type { Segment, SegmentDimension, SegmentInput, SegmentKind, SegmentUpdate, SegmentVocabulary } from '../../types/api'
import {
  conditionDocument,
  draftFromSaved,
  emptyCondition,
  type ConditionDraft,
  type VocabularyField
} from './audienceHelpers'
import { firstApiMessage } from '../../utils/apiForm'

const KINDS: Array<SegmentKind> = ['MARKETING', 'OPERATIONAL']
const AXES: Array<SegmentDimension> = ['BEHAVIOUR', 'INTEREST', 'LOCATION', 'PROFILE', 'PROMOTION']

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  segment: Segment | null
  vocabulary: SegmentVocabulary | null
}>()

const emit = defineEmits<{
  saved: [segment: Segment]
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const name = ref('')
const sentence = ref('')
const feeds = ref('')
const kind = ref<SegmentKind>('MARKETING')
const active = ref(true)
const match = ref('all')
const dimensions = ref<Array<{ axis: SegmentDimension, label: string }>>([])
const drafts = ref<Array<ConditionDraft>>([])
const saving = ref(false)
const error = ref('')

const fields = computed(() => props.vocabulary?.data.fields ?? [])
const combinators = computed(() => props.vocabulary?.data.combinators ?? [])
const editing = computed(() => props.segment !== null)

const kindItems = computed(() => KINDS.map(item => ({
  label: item,
  value: item
})))

const matchItems = computed(() => combinators.value.map(item => ({
  label: item,
  value: item
})))

const fieldItems = computed(() => fields.value.map(field => ({
  label: field.label,
  value: field.field
})))

const flagItems = [
  { label: 'true', value: true },
  { label: 'false', value: false }
]

const axisItems = computed(() => AXES.map(axis => ({
  label: axis,
  value: axis
})))

const ready = computed(() => {
  if (name.value.trim() === '' || sentence.value.trim() === '' || feeds.value.trim() === '') {
    return false
  }

  return conditionDocument(match.value, drafts.value, fields.value) !== null
})

function specFor(field: string): VocabularyField | null {
  return fields.value.find(item => item.field === field) ?? null
}

function operatorItems(field: string): Array<{ label: string, value: string }> {
  return (specFor(field)?.operators ?? []).map(operator => ({
    label: operator,
    value: operator
  }))
}

function valueItems(field: string): Array<{ label: string, value: string }> {
  return (specFor(field)?.values ?? []).map(option => ({
    label: option,
    value: option
  }))
}

function enumItems(field: string): Array<{ label: string, value: string }> {
  return [
    { label: t('crmSegments.choose'), value: '' },
    ...valueItems(field)
  ]
}

function eventItems(values: Array<string> | undefined): Array<{ label: string, value: string }> {
  return [
    { label: t('crmSegments.choose'), value: '' },
    ...(values ?? []).map(option => ({
      label: option,
      value: option
    }))
  ]
}

function reset(): void {
  error.value = ''
  const current = props.segment
  const first = fields.value[0]

  if (current) {
    name.value = current.name
    sentence.value = current.sentence
    feeds.value = current.feeds
    kind.value = current.kind
    active.value = current.active
    match.value = combinators.value.includes(current.conditions.match)
      ? current.conditions.match
      : (combinators.value[0] ?? 'all')
    dimensions.value = current.dimensions.map(row => ({
      axis: row.axis,
      label: row.label
    }))
    drafts.value = current.conditions.items.flatMap((item) => {
      const spec = specFor(item.field)

      if (!spec) {
        return []
      }

      return [draftFromSaved(item, spec)]
    })

    if (drafts.value.length === 0 && first) {
      drafts.value = [emptyCondition(first)]
    }

    return
  }

  name.value = ''
  sentence.value = ''
  feeds.value = ''
  kind.value = 'MARKETING'
  active.value = true
  match.value = combinators.value.includes('all') ? 'all' : (combinators.value[0] ?? '')
  dimensions.value = []
  drafts.value = first ? [emptyCondition(first)] : []
}

watch(open, (isOpen) => {
  if (isOpen) {
    reset()
  }
})

function onField(index: number, value: string | number | boolean | null | undefined): void {
  if (typeof value !== 'string') {
    return
  }

  const spec = specFor(value)
  const current = drafts.value[index]

  if (!spec || !current) {
    return
  }

  drafts.value[index] = emptyCondition(spec)
}

function addCondition(): void {
  const first = fields.value[0]

  if (!first) {
    return
  }

  drafts.value.push(emptyCondition(first))
}

function removeCondition(index: number): void {
  if (drafts.value.length < 2) {
    return
  }

  drafts.value.splice(index, 1)
}

function addDimension(): void {
  const axis = AXES[0]

  if (!axis) {
    return
  }

  dimensions.value.push({ axis, label: '' })
}

function removeDimension(index: number): void {
  dimensions.value.splice(index, 1)
}

async function save(): Promise<void> {
  const conditions = conditionDocument(match.value, drafts.value, fields.value)

  if (conditions === null) {
    return
  }

  const fieldsBody: Omit<SegmentInput, 'conditions'> = {
    name: name.value.trim(),
    sentence: sentence.value.trim(),
    feeds: feeds.value.trim(),
    kind: kind.value,
    active: active.value,
    dimensions: dimensions.value
      .filter(row => row.label.trim() !== '')
      .map(row => ({
        axis: row.axis,
        label: row.label.trim()
      }))
  }
  const current = props.segment
  const patch: Omit<SegmentUpdate, 'conditions'> = fieldsBody

  saving.value = true
  error.value = ''

  try {
    const saved = current
      ? await request(`/api/crm/segments/${encodeURIComponent(current.key)}`, {
        method: 'PATCH',
        body: { ...patch, conditions }
      }) as Segment
      : await request('/api/crm/segments', {
        method: 'POST',
        body: { ...fieldsBody, conditions }
      }) as Segment
    emit('saved', saved)
    toast.add({ title: t('crmSegments.saved') })
    open.value = false
  } catch (caught: unknown) {
    error.value = firstApiMessage(caught) ?? t('crmSegments.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="editing ? t('crmSegments.edit') : t('crmSegments.create')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="save"
      >
        <p
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </p>
        <div class="field">
          <label for="segment-name">{{ t('crmSegments.name') }}</label>
          <input
            id="segment-name"
            v-model="name"
            type="text"
            maxlength="160"
          >
        </div>
        <div class="field">
          <label for="segment-sentence">{{ t('crmSegments.sentence') }}</label>
          <textarea
            id="segment-sentence"
            v-model="sentence"
            rows="3"
            maxlength="500"
          />
        </div>
        <div class="field">
          <label for="segment-feeds">{{ t('crmSegments.feedsLabel') }}</label>
          <input
            id="segment-feeds"
            v-model="feeds"
            type="text"
            maxlength="500"
          >
        </div>
        <div class="field">
          <label for="segment-kind">{{ t('crmSegments.kind') }}</label>
          <USelect
            id="segment-kind"
            v-model="kind"
            class="w-full"
            :items="kindItems"
          />
        </div>
        <label class="crm-check">
          <input
            v-model="active"
            type="checkbox"
          >
          {{ t('crmSegments.active') }}
        </label>
        <div class="field">
          <label for="segment-match">{{ t('crmSegments.match') }}</label>
          <USelect
            id="segment-match"
            v-model="match"
            class="w-full"
            :items="matchItems"
          />
        </div>

        <div
          v-for="(draft, index) in drafts"
          :key="index"
          class="seg-condition"
        >
          <div class="field">
            <label :for="`segment-field-${String(index)}`">{{ t('crmSegments.field') }}</label>
            <USelect
              :id="`segment-field-${String(index)}`"
              class="w-full"
              :model-value="draft.field"
              :items="fieldItems"
              @update:model-value="onField(index, $event)"
            />
          </div>
          <div class="field">
            <label :for="`segment-operator-${String(index)}`">{{ t('crmSegments.operator') }}</label>
            <USelect
              :id="`segment-operator-${String(index)}`"
              v-model="draft.operator"
              class="w-full"
              :items="operatorItems(draft.field)"
            />
          </div>
          <div
            v-if="specFor(draft.field)?.value === 'boolean'"
            class="field"
          >
            <label :for="`segment-flag-${String(index)}`">{{ t('crmSegments.value') }}</label>
            <USelect
              :id="`segment-flag-${String(index)}`"
              v-model="draft.flag"
              class="w-full"
              :items="flagItems"
            />
          </div>
          <div
            v-else-if="specFor(draft.field)?.value === 'age_range'"
            class="seg-age"
          >
            <div class="field">
              <label :for="`segment-age-min-${String(index)}`">{{ t('crmSegments.ageMin') }}</label>
              <input
                :id="`segment-age-min-${String(index)}`"
                v-model="draft.ageMin"
                type="text"
                inputmode="numeric"
              >
            </div>
            <div class="field">
              <label :for="`segment-age-max-${String(index)}`">{{ t('crmSegments.ageMax') }}</label>
              <input
                :id="`segment-age-max-${String(index)}`"
                v-model="draft.ageMax"
                type="text"
                inputmode="numeric"
              >
            </div>
          </div>
          <div
            v-else-if="draft.operator === 'in' && specFor(draft.field)?.values"
            class="field"
          >
            <label :for="`segment-many-${String(index)}`">{{ t('crmSegments.value') }}</label>
            <USelect
              :id="`segment-many-${String(index)}`"
              v-model="draft.selected"
              class="w-full"
              multiple
              :items="valueItems(draft.field)"
            />
          </div>
          <div
            v-else-if="draft.operator === 'in'"
            class="field"
          >
            <label :for="`segment-list-${String(index)}`">{{ t('crmSegments.value') }}</label>
            <input
              :id="`segment-list-${String(index)}`"
              v-model="draft.listText"
              type="text"
            >
            <p class="field-hint">
              {{ t('crmSegments.commaSeparated') }}
            </p>
          </div>
          <div
            v-else-if="specFor(draft.field)?.values"
            class="field"
          >
            <label :for="`segment-enum-${String(index)}`">{{ t('crmSegments.value') }}</label>
            <USelect
              :id="`segment-enum-${String(index)}`"
              v-model="draft.single"
              class="w-full"
              :items="enumItems(draft.field)"
            />
          </div>
          <div
            v-else
            class="field"
          >
            <label :for="`segment-single-${String(index)}`">{{ t('crmSegments.value') }}</label>
            <input
              :id="`segment-single-${String(index)}`"
              v-model="draft.single"
              type="text"
            >
          </div>
          <template
            v-for="param in specFor(draft.field)?.params ?? []"
            :key="param.name"
          >
            <div
              v-if="param.name === 'event'"
              class="field"
            >
              <label :for="`segment-event-${String(index)}`">{{ param.name }}</label>
              <USelect
                :id="`segment-event-${String(index)}`"
                v-model="draft.event"
                class="w-full"
                :items="eventItems(param.values)"
              />
            </div>
            <div
              v-else-if="param.name === 'within_days'"
              class="field"
            >
              <label :for="`segment-window-${String(index)}`">{{ param.name }}</label>
              <input
                :id="`segment-window-${String(index)}`"
                v-model="draft.withinDays"
                type="text"
                inputmode="numeric"
              >
              <p class="field-hint">
                {{ t('crmSegments.windowHint') }}
              </p>
            </div>
          </template>
          <UButton
            v-if="drafts.length > 1"
            type="button"
            variant="outline"
            @click="removeCondition(index)"
          >
            {{ t('crmSegments.removeCondition') }}
          </UButton>
        </div>
        <UButton
          type="button"
          variant="outline"
          @click="addCondition"
        >
          {{ t('crmSegments.addCondition') }}
        </UButton>

        <div
          v-for="(row, index) in dimensions"
          :key="`dim-${String(index)}`"
          class="seg-condition"
        >
          <div class="field">
            <label :for="`segment-axis-${String(index)}`">{{ t('crmSegments.axis') }}</label>
            <USelect
              :id="`segment-axis-${String(index)}`"
              v-model="row.axis"
              class="w-full"
              :items="axisItems"
            />
          </div>
          <div class="field">
            <label :for="`segment-dim-label-${String(index)}`">{{ t('crmSegments.tag') }}</label>
            <input
              :id="`segment-dim-label-${String(index)}`"
              v-model="row.label"
              type="text"
              maxlength="160"
            >
          </div>
          <UButton
            type="button"
            variant="outline"
            @click="removeDimension(index)"
          >
            {{ t('crmSegments.removeTag') }}
          </UButton>
        </div>
        <UButton
          type="button"
          variant="outline"
          @click="addDimension"
        >
          {{ t('crmSegments.addTag') }}
        </UButton>

        <div class="modal-actions">
          <UButton
            type="button"
            variant="outline"
            :disabled="saving"
            @click="open = false"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="saving"
            :disabled="saving || !ready"
          >
            {{ t('crmSegments.save') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
