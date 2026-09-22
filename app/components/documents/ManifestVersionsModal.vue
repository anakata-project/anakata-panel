<script setup lang="ts">
import type { ManifestVersion } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  departureId: number | null
  reference: string
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()

const rows = ref<Array<ManifestVersion>>([])
const loadError = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    void load()
  }
})

function generatedLabel(row: ManifestVersion): string {
  const when = row.generated_at === null ? '—' : format(row.generated_at, 'dateTime')
  const who = row.generated_by?.name

  return who === undefined || who === '' ? when : `${when} · ${who}`
}

async function load(): Promise<void> {
  if (props.departureId === null) {
    rows.value = []
    return
  }

  loadError.value = ''

  try {
    const payload = await request(`/api/rms/departures/${String(props.departureId)}/manifests`) as {
      data: Array<ManifestVersion>
    }
    rows.value = payload.data
  } catch (error: unknown) {
    rows.value = []
    loadError.value = firstApiMessage(error) ?? t('documents.generateFailed')
  }
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('documents.versionsTitle')"
    :description="reference"
    @update:open="open = $event"
  >
    <template #body>
      <p
        v-if="loadError !== ''"
        class="note"
      >
        {{ loadError }}
      </p>
      <p
        v-else-if="rows.length === 0"
        class="note"
      >
        {{ t('documents.versionsEmpty') }}
      </p>
      <table
        v-else
        class="list"
      >
        <thead>
          <tr>
            <th>{{ t('documents.colKind') }}</th>
            <th>{{ t('documents.colVersion') }}</th>
            <th>{{ t('documents.colReason') }}</th>
            <th>{{ t('documents.colGenerated') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows"
            :key="row.id"
          >
            <td>{{ row.kind }}</td>
            <td>v{{ row.version }}</td>
            <td>{{ row.reason }}</td>
            <td>{{ generatedLabel(row) }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </UModal>
</template>
