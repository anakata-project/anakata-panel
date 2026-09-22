<script setup lang="ts">
import type { ManifestIssued, ManifestKind, ManifestRow } from '../../types/api'
import ManifestVersionsModal from './ManifestVersionsModal.vue'
import { downloadDocumentFile } from './documentFetch'
import {
  manifestBarWidth,
  manifestNoticeOffsets,
  manifestStatusClass,
  offsetLabel,
  type ManifestNoticeOffsets
} from './manifestHelpers'
import { firstApiMessage } from '../../utils/apiForm'

const props = defineProps<{
  from: string | null
  to: string | null
}>()

const emit = defineEmits<{
  offsets: [value: ManifestNoticeOffsets]
}>()

const KINDS: Array<ManifestKind> = ['DPNG', 'CAPTAIN']

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const toast = useToast()

const rows = ref<Array<ManifestRow>>([])
const loadError = ref('')
const generatingId = ref<number | null>(null)
const versionsOpen = ref(false)
const versionsDepartureId = ref<number | null>(null)
const versionsReference = ref('')

const canDownload = computed(() => can('guests.view_sensitive'))

const listUrl = computed(() => {
  const params = new URLSearchParams()

  if (props.from !== null) {
    params.set('from', props.from)
  }

  if (props.to !== null) {
    params.set('to', props.to)
  }

  const query = params.toString()

  return query === '' ? '/api/rms/manifests' : `/api/rms/manifests?${query}`
})

watch(listUrl, () => {
  void load()
}, { immediate: true })

watch(rows, (value) => {
  emit('offsets', manifestNoticeOffsets(value))
})

async function load(): Promise<void> {
  try {
    const payload = await request(listUrl.value) as { data: Array<ManifestRow> }
    rows.value = payload.data
    loadError.value = ''
  } catch (error: unknown) {
    rows.value = []
    loadError.value = firstApiMessage(error) ?? t('documents.generateFailed')
    emit('offsets', manifestNoticeOffsets([]))
  }
}

async function download(row: ManifestRow, kind: ManifestKind, formatName: string): Promise<void> {
  const version = kind === 'DPNG' ? row.dpng : row.captain

  if (version === null) {
    return
  }

  try {
    await downloadDocumentFile(
      `/api/rms/departures/${String(row.departure_id)}/manifests/${String(version.id)}/file/${formatName}`,
      `${row.reference}-${kind}.${formatName}`
    )
  } catch (error: unknown) {
    toast.add({
      title: error instanceof Error ? error.message : t('documents.downloadFailed')
    })
  }
}

async function generate(row: ManifestRow): Promise<void> {
  if (generatingId.value !== null) {
    return
  }

  generatingId.value = row.departure_id

  try {
    for (const kind of KINDS) {
      try {
        const issued = await request(
          `/api/rms/departures/${String(row.departure_id)}/manifests/${kind}`,
          { method: 'POST' }
        ) as ManifestIssued
        toast.add({ title: issued.message })
      } catch (error: unknown) {
        toast.add({
          title: firstApiMessage(error) ?? t('documents.generateFailed')
        })
      }
    }

    await load()
  } finally {
    generatingId.value = null
  }
}

function openVersions(row: ManifestRow): void {
  versionsDepartureId.value = row.departure_id
  versionsReference.value = row.reference
  versionsOpen.value = true
}
</script>

<template>
  <div class="panel">
    <h3>{{ t('documents.manifestsTitle') }}</h3>
    <div class="bk-table-wrap">
      <table class="list">
        <thead>
          <tr>
            <th>{{ t('documents.colDeparture') }}</th>
            <th>{{ t('documents.colPassengers') }}</th>
            <th>{{ t('documents.colPassengerData') }}</th>
            <th>{{ t('documents.colDpngDue') }}</th>
            <th>{{ t('documents.colCaptain') }}</th>
            <th>{{ t('documents.colStatus') }}</th>
            <th>{{ t('documents.colLatest') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr
            v-if="loadError !== ''"
            class="dr-empty"
          >
            <td colspan="8">
              {{ loadError }}
            </td>
          </tr>
          <tr
            v-else-if="rows.length === 0"
            class="dr-empty"
          >
            <td colspan="8">
              {{ t('documents.manifestsEmpty') }}
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.departure_id"
          >
            <td class="nw">
              <b>{{ format(row.date, 'short') }}</b>
              <div class="gmeta">
                {{ row.charter ? `${row.yacht} · ${t('documents.charter')}` : row.yacht }}
              </div>
            </td>
            <td>{{ row.passengers }}</td>
            <td>
              <div class="invbar">
                <i :style="{ width: manifestBarWidth(row.complete, row.passengers), background: 'var(--ok)' }" />
              </div>
              <div class="invtxt">
                {{ t('documents.complete', { complete: String(row.complete), passengers: String(row.passengers) }) }}
              </div>
            </td>
            <td class="nw">
              {{ format(row.dpng_due, 'short') }}
              <div class="gmeta">
                {{ offsetLabel(row.dpng_offset_days) }}
              </div>
            </td>
            <td class="nw">
              {{ format(row.captain_due, 'short') }}
              <div class="gmeta">
                {{ offsetLabel(row.captain_offset_days) }}
              </div>
            </td>
            <td>
              <span
                class="pill"
                :class="manifestStatusClass(row.status)"
              >{{ row.status }}</span>
            </td>
            <td class="nw">
              <div class="gmeta">
                {{ row.dpng === null ? '—' : t('documents.versionDpng', { version: String(row.dpng.version) }) }}
              </div>
              <div class="gmeta">
                {{ row.captain === null ? '—' : t('documents.versionCaptain', { version: String(row.captain.version) }) }}
              </div>
            </td>
            <td class="list-actions">
              <p
                v-if="!canDownload"
                class="gmeta"
              >
                {{ t('documents.restricted') }}
              </p>
              <template v-else>
                <button
                  v-if="row.dpng"
                  type="button"
                  class="mini"
                  @click="download(row, 'DPNG', 'pdf')"
                >
                  {{ t('documents.dpngPdf') }}
                </button>
                <button
                  v-if="row.dpng"
                  type="button"
                  class="mini"
                  @click="download(row, 'DPNG', 'csv')"
                >
                  {{ t('documents.dpngCsv') }}
                </button>
                <button
                  v-if="row.dpng"
                  type="button"
                  class="mini"
                  @click="download(row, 'DPNG', 'xlsx')"
                >
                  {{ t('documents.dpngXlsx') }}
                </button>
                <button
                  v-if="row.captain"
                  type="button"
                  class="mini"
                  @click="download(row, 'CAPTAIN', 'pdf')"
                >
                  {{ t('documents.captainPdf') }}
                </button>
                <button
                  type="button"
                  class="mini"
                  :disabled="generatingId === row.departure_id"
                  @click="generate(row)"
                >
                  {{ t('documents.generate') }}
                </button>
                <button
                  type="button"
                  class="mini"
                  @click="openVersions(row)"
                >
                  {{ t('documents.versions') }}
                </button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ManifestVersionsModal
      v-model:open="versionsOpen"
      :departure-id="versionsDepartureId"
      :reference="versionsReference"
    />
  </div>
</template>
