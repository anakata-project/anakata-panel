<script setup lang="ts">
import type { Segment, SegmentVocabulary } from '../../../types/api'
import SegmentContactsDrawer from '../../../components/crm/SegmentContactsDrawer.vue'
import SegmentRuleModal from '../../../components/crm/SegmentRuleModal.vue'
import { dimensionClass, pinSuppressedLast } from '../../../components/crm/audienceHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

type SegmentList = {
  data: Array<Segment>
  meta: {
    cap: number
    capped: boolean
    message: string | null
  }
}

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()

const canManage = computed(() => can('contacts.manage'))
const segments = ref<Array<Segment>>([])
const vocabulary = ref<SegmentVocabulary | null>(null)
const capMessage = ref<string | null>(null)
const loadError = ref('')
const cards = computed(() => pinSuppressedLast(segments.value))

const listKey = ref<string | null>(null)
const listName = ref('')
const listOpen = ref(false)
const editorOpen = ref(false)
const editing = ref<Segment | null>(null)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  try {
    const [list, vocab] = await Promise.all([
      request('/api/crm/segments') as Promise<SegmentList>,
      request('/api/crm/segments/vocabulary') as Promise<SegmentVocabulary>
    ])
    segments.value = list.data
    capMessage.value = list.meta.capped ? list.meta.message : null
    vocabulary.value = vocab
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmSegments.failed')
  }
}

function openList(segment: Segment): void {
  listKey.value = segment.key
  listName.value = segment.name
  listOpen.value = true
}

function openCreate(): void {
  editing.value = null
  editorOpen.value = true
}

function openEdit(segment: Segment): void {
  editing.value = segment
  editorOpen.value = true
}

function onSaved(saved: Segment): void {
  const index = segments.value.findIndex(item => item.key === saved.key)

  if (index === -1) {
    segments.value = [...segments.value, saved]
    return
  }

  segments.value = segments.value.map(item => item.key === saved.key ? saved : item)
}
</script>

<template>
  <div>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>
    <p
      v-if="capMessage"
      class="notice"
    >
      {{ capMessage }}
    </p>
    <div
      v-if="canManage"
      class="seg-toolbar"
    >
      <UButton
        :disabled="vocabulary === null"
        @click="openCreate"
      >
        {{ t('crmSegments.create') }}
      </UButton>
    </div>
    <div class="segs">
      <article
        v-for="segment in cards"
        :key="segment.key"
        class="segc"
        :class="{ exception: segment.key === 'suppressed' }"
      >
        <button
          type="button"
          class="seg-open"
          @click="openList(segment)"
        >
          <div class="seg-head">
            <h4>{{ segment.name }}</h4>
            <span class="n">{{ segment.count }}</span>
          </div>
          <div class="rule">
            “{{ segment.sentence }}”
          </div>
          <div class="dimrow">
            <span
              v-for="(tag, index) in segment.dimensions"
              :key="`${segment.key}-${String(index)}`"
              class="dim"
              :class="dimensionClass(tag.axis)"
            >{{ tag.axis }} · {{ tag.label }}</span>
          </div>
          <div class="feeds">
            {{ t('crmSegments.feeds') }} <b>{{ segment.feeds }}</b>
          </div>
        </button>
        <div
          v-if="canManage && !segment.system"
          class="seg-actions"
        >
          <UButton
            variant="outline"
            @click="openEdit(segment)"
          >
            {{ t('crmSegments.edit') }}
          </UButton>
        </div>
      </article>
    </div>
    <SegmentContactsDrawer
      v-model:open="listOpen"
      :segment-key="listKey"
      :segment-name="listName"
    />
    <SegmentRuleModal
      v-model:open="editorOpen"
      :segment="editing"
      :vocabulary="vocabulary"
      @saved="onSaved"
    />
  </div>
</template>
