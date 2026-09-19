<script setup lang="ts">
import type { ChangeHistoryEntry, Paginated } from '../../types/api'
import type { PermissionLabel } from './describe'

const props = defineProps<{
  open: boolean
  title: string
  subjectType: string
  url: string | null
  permissionLabel?: PermissionLabel
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
}>()

const { t } = useI18n()
const { request } = useApi()
const { zoneLabel } = useDates()

const entries = ref<Array<ChangeHistoryEntry>>([])
const page = ref(1)
const lastPage = ref(1)
const loading = ref(false)

async function load(reset: boolean): Promise<void> {
  if (!props.url) {
    return
  }

  if (reset) {
    page.value = 1
    entries.value = []
  }

  loading.value = true

  try {
    const result = await request(`${props.url}?page=${page.value}`) as Paginated<ChangeHistoryEntry>
    entries.value = reset ? result.data : [...entries.value, ...result.data]
    lastPage.value = result.meta.last_page
  } finally {
    loading.value = false
  }
}

async function loadOlder(): Promise<void> {
  page.value += 1
  await load(false)
}

watch(
  () => [props.open, props.url] as const,
  ([isOpen, url]) => {
    if (isOpen && url) {
      void load(true)
    }
  }
)
</script>

<template>
  <USlideover
    :open="open"
    class="history-drawer"
    @update:open="emit('update:open', $event)"
  >
    <template #header>
      <div>
        <h2>{{ title }}</h2>
        <div class="bid">
          {{ subjectType }}
        </div>
      </div>
    </template>

    <template #body>
      <p class="history-note">
        {{ t('history.note') }}
      </p>
      <p class="history-zone">
        {{ zoneLabel() }}
      </p>
      <HistoryTimeline
        :entries="entries"
        :permission-label="props.permissionLabel"
      />
      <button
        v-if="page < lastPage"
        type="button"
        class="history-load"
        :disabled="loading"
        @click="loadOlder"
      >
        {{ t('history.loadOlder') }}
      </button>
    </template>
  </USlideover>
</template>
