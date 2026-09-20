<script setup lang="ts">
import type { Itinerary, ItineraryDefaults } from '../../../types/api'
import ItineraryCard from '../../../components/itineraries/ItineraryCard.vue'
import ItineraryEditor from '../../../components/itineraries/ItineraryEditor.vue'

const { can, user } = useAuth()
const { t } = useI18n()
const { useFetch } = useApi()

const { data: listPayload, refresh } = useFetch<{ data: Array<Itinerary> }>('/api/rms/itineraries')
const { data: defaults } = useFetch<ItineraryDefaults>('/api/rms/itineraries/defaults')

const itineraries = computed(() => listPayload.value?.data ?? [])

const publishedCount = computed(() => {
  return itineraries.value.filter(item => item.status === 'PUBLISHED').length
})

const canManage = computed(() => can('itineraries.manage'))
const roleName = computed(() => user.value?.role.name ?? '')

const editorOpen = ref(false)
const selected = ref<Itinerary | null>(null)

function openNew(): void {
  selected.value = null
  editorOpen.value = true
}

function openExisting(itinerary: Itinerary): void {
  selected.value = itinerary
  editorOpen.value = true
}

async function onSaved(itinerary: Itinerary): Promise<void> {
  await refresh()
  const fresh = itineraries.value.find(item => item.id === itinerary.id)
  selected.value = fresh ?? itinerary
}

async function onDeleted(): Promise<void> {
  selected.value = null
  await refresh()
}
</script>

<template>
  <div>
    <p class="notice itin-notice">
      {{ t('itineraries.noticeBefore') }}<b>{{ t('itineraries.noticeCards') }}</b>{{ t('itineraries.noticeMid') }}<b>{{ t('itineraries.noticeTrip') }}</b>{{ t('itineraries.noticeAfter') }}
    </p>

    <div class="ebtool">
      <span
        class="mono"
        style="color: var(--iv62)"
      >
        {{ t('itineraries.count', {
          published: String(publishedCount),
          total: String(itineraries.length)
        }) }}
      </span>
      <div class="acts">
        <UButton
          v-if="canManage"
          @click="openNew"
        >
          {{ t('itineraries.new') }}
        </UButton>
      </div>
    </div>

    <div class="itgrid">
      <ItineraryCard
        v-for="itinerary in itineraries"
        :key="itinerary.id"
        :itinerary="itinerary"
        @open="openExisting(itinerary)"
      />
    </div>

    <ItineraryEditor
      v-model:open="editorOpen"
      :source="selected"
      :defaults="defaults ?? null"
      :can-manage="canManage"
      :role-name="roleName"
      @saved="onSaved"
      @deleted="onDeleted"
    />
  </div>
</template>
