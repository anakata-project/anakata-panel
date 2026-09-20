<script setup lang="ts">
import type { Itinerary, ItineraryDefaults, ItineraryGradient, ItineraryStatus } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { linesToList } from '../../utils/linesToList'
import { confirmUnsaved } from '../../composables/useUnsavedGuard'
import {
  addDayPlanRow,
  addFaqRow,
  adoptCreated,
  draftFromDefaults,
  draftFromItinerary,
  editorSnapshot,
  itineraryContentBody,
  removePairRow,
  savePublishPlan,
  statusPillClass,
  type ItineraryDraft
} from './itineraryHelpers'

const isOpen = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  source: Itinerary | null
  defaults: ItineraryDefaults | null
  canManage: boolean
  roleName: string
}>()

const emit = defineEmits<{
  saved: [itinerary: Itinerary]
  deleted: [id: number]
}>()

const { t } = useI18n()
const { request } = useApi()

const draft = ref<ItineraryDraft | null>(null)
const snapshot = ref('')
const warn = ref('')
const saving = ref(false)
const historyOpen = ref(false)
const highlightsText = ref('')
const chipsText = ref('')
const includedText = ref('')
const excludedText = ref('')
const dirty = computed(() => {
  return draft.value !== null && editorSnapshot(draft.value) !== snapshot.value
})

const gradients = computed<Array<ItineraryGradient>>(() => props.defaults?.gradients ?? [])

const isNew = computed(() => draft.value?.id === null)

const title = computed(() => {
  if (draft.value === null || isNew.value) {
    return t('itineraries.newTitle')
  }

  return draft.value.name
})

const bidExisting = computed(() => {
  if (draft.value === null || draft.value.id === null) {
    return ''
  }

  return t('itineraries.existingBid', {
    code: draft.value.code,
    n: String(draft.value.departures_count)
  })
})

const historyUrl = computed(() => {
  return draft.value?.id ? `/api/rms/itineraries/${draft.value.id}/history` : null
})

const hasDepartures = computed(() => (draft.value?.departures_count ?? 0) > 0)

function resetFrom(source: Itinerary | null): void {
  if (source) {
    draft.value = draftFromItinerary(source)
  } else if (props.defaults) {
    draft.value = draftFromDefaults(props.defaults)
  } else {
    draft.value = null
    return
  }

  highlightsText.value = draft.value.highlights.join('\n')
  chipsText.value = draft.value.chips.join('\n')
  includedText.value = draft.value.included.join('\n')
  excludedText.value = draft.value.excluded.join('\n')
  snapshot.value = editorSnapshot(draft.value)
  warn.value = ''
}

watch(
  isOpen,
  (open) => {
    if (open) {
      resetFrom(props.source)
    }
  }
)

function onListInput(
  event: Event,
  text: typeof highlightsText,
  assign: (lines: Array<string>) => void
): void {
  const target = event.target

  if (!(target instanceof HTMLTextAreaElement) || draft.value === null) {
    return
  }

  text.value = target.value
  assign(linesToList(target.value))
}

function onHighlightsInput(event: Event): void {
  onListInput(event, highlightsText, (lines) => {
    if (draft.value) {
      draft.value.highlights = lines
    }
  })
}

function onChipsInput(event: Event): void {
  onListInput(event, chipsText, (lines) => {
    if (draft.value) {
      draft.value.chips = lines
    }
  })
}

function onIncludedInput(event: Event): void {
  onListInput(event, includedText, (lines) => {
    if (draft.value) {
      draft.value.included = lines
    }
  })
}

function onExcludedInput(event: Event): void {
  onListInput(event, excludedText, (lines) => {
    if (draft.value) {
      draft.value.excluded = lines
    }
  })
}

function setGradient(key: string): void {
  if (draft.value === null) {
    return
  }

  draft.value.fallback_gradient_key = key
  const match = gradients.value.find(entry => entry.key === key)

  if (match) {
    draft.value.fallback_gradient = match.css
  }
}

function syncListTexts(next: ItineraryDraft): void {
  highlightsText.value = next.highlights.join('\n')
  chipsText.value = next.chips.join('\n')
  includedText.value = next.included.join('\n')
  excludedText.value = next.excluded.join('\n')
}

function applySaved(itinerary: Itinerary): void {
  draft.value = draftFromItinerary(itinerary)
  syncListTexts(draft.value)
  snapshot.value = editorSnapshot(draft.value)
  emit('saved', itinerary)
}

async function createDraft(): Promise<Itinerary> {
  if (draft.value === null) {
    throw new Error('No draft')
  }

  return await request('/api/rms/itineraries', {
    method: 'POST',
    body: {
      code: draft.value.code,
      ...itineraryContentBody(draft.value)
    }
  }) as Itinerary
}

async function patchDraft(status: ItineraryStatus): Promise<Itinerary> {
  if (draft.value === null || draft.value.id === null) {
    throw new Error('No itinerary')
  }

  return await request(`/api/rms/itineraries/${draft.value.id}`, {
    method: 'PATCH',
    body: {
      ...itineraryContentBody(draft.value),
      status
    }
  }) as Itinerary
}

function showError(error: unknown): void {
  warn.value = firstApiMessage(error)
    ?? (error instanceof Error ? error.message : 'Request failed')
}

async function savePublish(): Promise<void> {
  if (draft.value === null) {
    return
  }

  warn.value = ''
  saving.value = true

  try {
    if (savePublishPlan(draft.value.id) === 'create-then-publish') {
      const created = await createDraft()
      draft.value = adoptCreated(draft.value, created)
      snapshot.value = editorSnapshot(draft.value)
      emit('saved', created)
    }

    const updated = await patchDraft('PUBLISHED')
    applySaved(updated)
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

async function saveDraft(): Promise<void> {
  if (draft.value === null) {
    return
  }

  warn.value = ''
  saving.value = true

  try {
    if (draft.value.id === null) {
      const created = await createDraft()
      draft.value = adoptCreated(draft.value, created)
      snapshot.value = editorSnapshot(draft.value)
      emit('saved', created)
      return
    }

    const updated = await patchDraft('DRAFT')
    applySaved(updated)
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

async function hide(): Promise<void> {
  if (draft.value === null || draft.value.id === null) {
    return
  }

  warn.value = ''
  saving.value = true

  try {
    const updated = await patchDraft('HIDDEN')
    applySaved(updated)
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

async function remove(): Promise<void> {
  if (draft.value === null || draft.value.id === null || hasDepartures.value) {
    return
  }

  if (!window.confirm(t('itineraries.deleteConfirm', { name: draft.value.name }))) {
    return
  }

  warn.value = ''
  saving.value = true

  try {
    const id = draft.value.id
    await request(`/api/rms/itineraries/${id}`, { method: 'DELETE' })
    emit('deleted', id)
    isOpen.value = false
  } catch (error) {
    showError(error)
  } finally {
    saving.value = false
  }
}

async function onImage(event: Event): Promise<void> {
  const target = event.target

  if (!(target instanceof HTMLInputElement) || draft.value === null || draft.value.id === null) {
    return
  }

  const file = target.files?.[0]

  if (!file) {
    return
  }

  if (file.size > 4e6) {
    window.alert(t('itineraries.photoTooLarge'))
    target.value = ''
    return
  }

  const body = new FormData()
  body.append('image', file)

  try {
    const updated = await request(`/api/rms/itineraries/${draft.value.id}/image`, {
      method: 'POST',
      body
    }) as Itinerary

    draft.value.hero_image_url = updated.hero_image_url
    draft.value.completeness = updated.completeness

    if (draft.value.hero_alt.trim() === '') {
      draft.value.hero_alt = `${draft.value.name} — Galápagos`
    }

    snapshot.value = editorSnapshot(draft.value)

    emit('saved', {
      ...updated,
      hero_alt: draft.value.hero_alt
    })
  } catch (error) {
    showError(error)
  } finally {
    target.value = ''
  }
}

function onUpdateOpen(value: boolean): void {
  if (!value && dirty.value && !confirmUnsaved(t('config.leaveUnsaved'))) {
    return
  }

  isOpen.value = value
}

useUnsavedGuard(dirty, () => t('config.leaveUnsaved'))
</script>

<template>
  <USlideover
    :open="isOpen"
    class="history-drawer"
    @update:open="onUpdateOpen"
  >
    <template #header>
      <div class="itin-header">
        <div>
          <h2>{{ title }}</h2>
          <div class="bid">
            <template v-if="isNew">
              {{ t('itineraries.newBid') }}
            </template>
            <template v-else-if="draft">
              {{ bidExisting }} ·
              <span
                class="pill"
                :class="statusPillClass(draft.status)"
              >{{ draft.status }}</span>
            </template>
          </div>
        </div>
        <UButton
          v-if="draft?.id && canManage"
          variant="outline"
          @click="historyOpen = true"
        >
          {{ t('itineraries.history') }}
        </UButton>
      </div>
    </template>

    <template #body>
      <p
        v-if="!canManage"
        class="notice"
      >
        {{ t('itineraries.viewOnly', { role: roleName }) }}
      </p>

      <fieldset
        v-if="draft"
        class="edfs"
        :disabled="!canManage"
      >
        <div class="sec">
          <h4>{{ t('itineraries.basics') }}</h4>
          <div class="cols2">
            <div class="field">
              <label for="itin-name">{{ t('itineraries.name') }}</label>
              <input
                id="itin-name"
                v-model="draft.name"
                maxlength="40"
              >
            </div>
            <div class="field">
              <label for="itin-code">{{ t('itineraries.code') }}</label>
              <input
                id="itin-code"
                v-model="draft.code"
                class="itin-code"
                maxlength="10"
                :disabled="!isNew"
                :placeholder="t('itineraries.codePlaceholder')"
                @input="draft.code = draft.code.toUpperCase()"
              >
            </div>
          </div>
          <div class="cols2">
            <div class="field">
              <label for="itin-days">{{ t('itineraries.days') }}</label>
              <input
                id="itin-days"
                v-model.number="draft.days"
                type="number"
                min="1"
                max="30"
              >
            </div>
            <div class="field">
              <label for="itin-nights">{{ t('itineraries.nights') }}</label>
              <input
                id="itin-nights"
                v-model.number="draft.nights"
                type="number"
                min="1"
                max="30"
              >
            </div>
          </div>
          <div class="cols2">
            <div class="field">
              <label for="itin-embark">{{ t('itineraries.embark') }}</label>
              <input
                id="itin-embark"
                v-model="draft.embark"
              >
            </div>
            <div class="field">
              <label for="itin-disembark">{{ t('itineraries.disembark') }}</label>
              <input
                id="itin-disembark"
                v-model="draft.disembark"
              >
            </div>
          </div>
          <div class="cols2">
            <div class="field">
              <label for="itin-order">{{ t('itineraries.order') }}</label>
              <input
                id="itin-order"
                v-model.number="draft.sort_order"
                type="number"
                min="1"
              >
            </div>
            <div class="field">
              <label for="itin-tagline">{{ t('itineraries.tagline') }}</label>
              <input
                id="itin-tagline"
                v-model="draft.tagline"
              >
            </div>
          </div>
          <label class="chkline">
            <input
              v-model="draft.festive"
              type="checkbox"
            >
            {{ t('itineraries.festiveCheck') }}
          </label>
        </div>

        <div class="sec">
          <h4>{{ t('itineraries.cardSection') }}</h4>
          <div class="field">
            <label for="itin-hero">{{ t('itineraries.heroPhoto') }}</label>
            <input
              id="itin-hero"
              type="file"
              accept="image/*"
              :disabled="isNew || !canManage"
              @change="onImage"
            >
            <p
              v-if="isNew"
              class="field-hint"
            >
              {{ t('itineraries.photoHint') }}
            </p>
            <img
              v-if="draft.hero_image_url"
              class="itin-photo"
              :src="draft.hero_image_url"
              :alt="draft.hero_alt"
            >
          </div>
          <div class="cols2">
            <div class="field">
              <label for="itin-alt">{{ t('itineraries.alt') }}</label>
              <input
                id="itin-alt"
                v-model="draft.hero_alt"
                :placeholder="t('itineraries.altPlaceholder')"
              >
            </div>
            <div class="field">
              <label for="itin-fallback">{{ t('itineraries.fallback') }}</label>
              <select
                id="itin-fallback"
                :value="draft.fallback_gradient_key"
                @change="setGradient(($event.target as HTMLSelectElement).value)"
              >
                <option
                  v-for="gradient in gradients"
                  :key="gradient.key"
                  :value="gradient.key"
                >
                  {{ gradient.key }}
                </option>
              </select>
            </div>
          </div>
          <div class="field">
            <label for="itin-card-description">
              {{ t('itineraries.cardDescription') }}
              <span class="cnt">· {{ draft.card_description.length }} / 220</span>
            </label>
            <textarea
              id="itin-card-description"
              v-model="draft.card_description"
              rows="3"
              maxlength="220"
            />
          </div>
          <div class="cols2">
            <div class="field">
              <label for="itin-highlights">{{ t('itineraries.highlights') }}</label>
              <textarea
                id="itin-highlights"
                :value="highlightsText"
                rows="4"
                @input="onHighlightsInput"
              />
            </div>
            <div class="field">
              <label for="itin-chips">{{ t('itineraries.chips') }}</label>
              <textarea
                id="itin-chips"
                :value="chipsText"
                rows="4"
                @input="onChipsInput"
              />
            </div>
          </div>
          <div class="field">
            <label for="itin-overview">{{ t('itineraries.overview') }}</label>
            <textarea
              id="itin-overview"
              v-model="draft.overview"
              rows="2"
            />
          </div>
          <EnginePreviewBox :label="t('itineraries.previewLabel')" />
        </div>

        <div class="sec">
          <h4>{{ t('itineraries.tripSection') }}</h4>
          <div class="field">
            <label for="itin-long-description">{{ t('itineraries.longDescription') }}</label>
            <textarea
              id="itin-long-description"
              v-model="draft.long_description"
              rows="4"
            />
          </div>
          <label class="sublabel">{{ t('itineraries.facts') }}</label>
          <div
            v-for="(_fact, index) in draft.facts"
            :key="`fact-${index}`"
            class="edrow r2"
          >
            <input v-model="draft.facts[index]![0]">
            <input v-model="draft.facts[index]![1]">
          </div>
        </div>

        <div class="sec">
          <h4>{{ t('itineraries.daySection') }}</h4>
          <div
            v-for="(_day, index) in draft.day_plan"
            :key="`day-${index}`"
            class="edrow"
          >
            <input v-model="draft.day_plan[index]![0]">
            <textarea
              v-model="draft.day_plan[index]![1]"
              rows="2"
            />
            <button
              type="button"
              class="xbtn"
              :aria-label="t('itineraries.removeDay')"
              @click="draft.day_plan = removePairRow(draft.day_plan, index)"
            >
              ×
            </button>
          </div>
          <UButton
            variant="outline"
            @click="draft.day_plan = addDayPlanRow(draft.day_plan)"
          >
            {{ t('itineraries.addDay') }}
          </UButton>
        </div>

        <div class="sec">
          <h4>{{ t('itineraries.includesSection') }}</h4>
          <div class="field">
            <label for="itin-included">{{ t('itineraries.included') }}</label>
            <textarea
              id="itin-included"
              :value="includedText"
              rows="4"
              @input="onIncludedInput"
            />
          </div>
          <div class="field">
            <label for="itin-excluded">{{ t('itineraries.excluded') }}</label>
            <textarea
              id="itin-excluded"
              :value="excludedText"
              rows="4"
              @input="onExcludedInput"
            />
          </div>
        </div>

        <div class="sec">
          <h4>{{ t('itineraries.faqSection') }}</h4>
          <div
            v-for="(_faq, index) in draft.faqs"
            :key="`faq-${index}`"
            class="edrow"
          >
            <input
              v-model="draft.faqs[index]![0]"
              :placeholder="t('itineraries.question')"
            >
            <textarea
              v-model="draft.faqs[index]![1]"
              rows="2"
              :placeholder="t('itineraries.answer')"
            />
            <button
              type="button"
              class="xbtn"
              :aria-label="t('itineraries.removeFaq')"
              @click="draft.faqs = removePairRow(draft.faqs, index)"
            >
              ×
            </button>
          </div>
          <UButton
            variant="outline"
            @click="draft.faqs = addFaqRow(draft.faqs)"
          >
            {{ t('itineraries.addFaq') }}
          </UButton>
        </div>

        <div class="sec">
          <h4>{{ t('itineraries.searchSection') }}</h4>
          <div class="field">
            <label for="itin-slug">{{ t('itineraries.slug') }}</label>
            <input
              id="itin-slug"
              v-model="draft.slug"
              :placeholder="t('itineraries.slugPlaceholder')"
            >
          </div>
          <div class="field">
            <label for="itin-seo-title">
              {{ t('itineraries.seoTitle') }}
              <span class="cnt">· {{ draft.meta_title.length }} / 60</span>
            </label>
            <input
              id="itin-seo-title"
              v-model="draft.meta_title"
              maxlength="60"
            >
          </div>
          <div class="field">
            <label for="itin-seo-description">
              {{ t('itineraries.seoDescription') }}
              <span class="cnt">· {{ draft.meta_description.length }} / 155</span>
            </label>
            <textarea
              id="itin-seo-description"
              v-model="draft.meta_description"
              rows="2"
              maxlength="155"
            />
          </div>
        </div>
      </fieldset>

      <div
        v-if="warn"
        class="warnbox itin-warn"
      >
        {{ warn }}
      </div>

      <div class="transbtns">
        <template v-if="canManage">
          <UButton
            :disabled="saving"
            @click="savePublish"
          >
            {{ t('itineraries.savePublish') }}
          </UButton>
          <UButton
            variant="outline"
            :disabled="saving"
            @click="saveDraft"
          >
            {{ t('itineraries.saveDraft') }}
          </UButton>
          <UButton
            v-if="!isNew"
            variant="outline"
            :disabled="saving"
            @click="hide"
          >
            {{ t('itineraries.hide') }}
          </UButton>
          <UButton
            v-if="!isNew"
            variant="outline"
            :disabled="saving || hasDepartures"
            @click="remove"
          >
            {{ hasDepartures ? t('itineraries.deleteHasDepartures') : t('itineraries.delete') }}
          </UButton>
        </template>
        <UButton
          variant="outline"
          @click="onUpdateOpen(false)"
        >
          {{ t('itineraries.close') }}
        </UButton>
      </div>
    </template>
  </USlideover>

  <HistoryDrawer
    v-model:open="historyOpen"
    :title="draft?.name ?? ''"
    :subject-type="t('itineraries.subject')"
    :url="historyUrl"
  />
</template>
