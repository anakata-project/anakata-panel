<script setup lang="ts">
import type { Booking, DocumentPlanRow, IssuedDocument } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import {
  documentRowActions,
  documentStatusPillClass,
  issuedVersionsFor,
  previewTargetFor,
  versionLabel,
  type DocumentPreviewTarget
} from './documentHelpers'
import DocumentConfirmModal from './DocumentConfirmModal.vue'
import DocumentPreviewModal from './DocumentPreviewModal.vue'
import ReasonModal from '../bookings/ReasonModal.vue'

const props = defineProps<{
  booking: Booking
}>()

const emit = defineEmits<{
  updated: [booking?: Booking]
  openBilling: []
}>()

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const toast = useToast()

const plan = ref<Array<DocumentPlanRow>>([])
const issued = ref<Array<IssuedDocument>>([])
const loading = ref(false)
const loadError = ref('')

const previewOpen = ref(false)
const preview = ref<DocumentPreviewTarget | null>(null)

const resendOpen = ref(false)
const resendRow = ref<DocumentPlanRow | null>(null)
const resendSubmitting = ref(false)
const resendError = ref('')

const reasonOpen = ref(false)
const reasonRow = ref<DocumentPlanRow | null>(null)
const reasonSubmitting = ref(false)
const reasonError = ref('')

async function loadAll(): Promise<void> {
  loading.value = true
  loadError.value = ''

  try {
    const [planResult, issuedResult] = await Promise.all([
      request(`/api/rms/bookings/${props.booking.id}/documents/plan`) as Promise<{ data: Array<DocumentPlanRow> }>,
      request(`/api/rms/bookings/${props.booking.id}/documents`) as Promise<{ data: Array<IssuedDocument> }>
    ])
    plan.value = planResult.data
    issued.value = issuedResult.data
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : t('bookings.docsFailed'))
  } finally {
    loading.value = false
  }
}

async function afterWrite(): Promise<void> {
  await loadAll()
  emit('updated')
}

onMounted(() => {
  void loadAll()
})

watch(() => props.booking.id, () => {
  plan.value = []
  issued.value = []
  void loadAll()
})

function rowDate(row: DocumentPlanRow): string {
  return row.date === null ? '—' : format(row.date, 'short')
}

function currentIssued(row: DocumentPlanRow): IssuedDocument | null {
  if (row.document_id === null) {
    return null
  }

  return issued.value.find(document => document.id === row.document_id) ?? null
}

function currentVersionLabel(row: DocumentPlanRow): string {
  const document = currentIssued(row)

  return document === null ? '' : versionLabel(document)
}

function earlierVersions(row: DocumentPlanRow): Array<IssuedDocument> {
  return issuedVersionsFor(row, issued.value).filter(document => document.id !== row.document_id)
}

function openPreview(row: DocumentPlanRow): void {
  preview.value = previewTargetFor(row)
  previewOpen.value = true
}

function openIssuedPreview(document: IssuedDocument): void {
  preview.value = {
    title: `${document.kind_label} ${versionLabel(document)}`,
    htmlPath: `/api/rms/documents/${document.id}/html`,
    filePath: `/api/rms/documents/${document.id}/file`,
    fileName: `${document.kind}-v${String(document.version)}.pdf`
  }
  previewOpen.value = true
}

function startResend(row: DocumentPlanRow): void {
  if (row.document_id === null) {
    return
  }

  resendRow.value = row
  resendError.value = ''
  resendOpen.value = true
}

async function submitResend(): Promise<void> {
  const row = resendRow.value

  if (row === null || row.document_id === null) {
    return
  }

  resendSubmitting.value = true
  resendError.value = ''

  try {
    await request(`/api/rms/documents/${row.document_id}/send`, { method: 'POST' })
    toast.add({ title: t('bookings.docSentToast') })
    resendOpen.value = false
    resendRow.value = null
    await afterWrite()
  } catch (error: unknown) {
    resendError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : t('bookings.docsFailed'))
  } finally {
    resendSubmitting.value = false
  }
}

async function issueRow(row: DocumentPlanRow, reason: string | null): Promise<void> {
  const body: { reason?: string, payment_id?: number } = {}

  if (reason !== null && reason !== '') {
    body.reason = reason
  }

  if (row.kind === 'RECEIPT' && row.payment_id !== null) {
    body.payment_id = row.payment_id
  }

  await request(`/api/rms/bookings/${props.booking.id}/documents/${row.kind}/issue`, {
    method: 'POST',
    body
  })
}

function startIssue(row: DocumentPlanRow): void {
  if (row.version !== null) {
    reasonRow.value = row
    reasonError.value = ''
    reasonOpen.value = true
    return
  }

  void submitFirstIssue(row)
}

async function submitFirstIssue(row: DocumentPlanRow): Promise<void> {
  try {
    await issueRow(row, null)
    toast.add({ title: t('bookings.docIssuedToast') })
    await afterWrite()
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : t('bookings.docsFailed'))
  }
}

async function submitReissue(reason: string): Promise<void> {
  const row = reasonRow.value

  if (row === null) {
    return
  }

  reasonSubmitting.value = true
  reasonError.value = ''

  try {
    await issueRow(row, reason)
    toast.add({ title: t('bookings.docIssuedToast') })
    reasonOpen.value = false
    reasonRow.value = null
    await afterWrite()
  } catch (error: unknown) {
    reasonError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : t('bookings.docsFailed'))
  } finally {
    reasonSubmitting.value = false
  }
}

const resendBody = computed(() => {
  const row = resendRow.value

  if (row === null) {
    return ''
  }

  return t('bookings.docResendBody', { name: row.name, recipient: row.recipient })
})
</script>

<template>
  <div>
    <p class="note extras-intro">
      {{ t('bookings.docsNote') }}
    </p>

    <p
      v-if="loading && plan.length === 0"
      class="note"
    >
      {{ t('bookings.docsLoading') }}
    </p>
    <div
      v-else-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </div>

    <table
      v-if="plan.length > 0"
      class="list mini-t"
    >
      <thead>
        <tr>
          <th>{{ t('bookings.docColDocument') }}</th>
          <th>{{ t('bookings.docColTrigger') }}</th>
          <th>{{ t('bookings.docColDate') }}</th>
          <th>{{ t('bookings.docColStatus') }}</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in plan"
          :key="`${row.kind}-${row.payment_id ?? row.reminder_days ?? 0}`"
        >
          <td>
            {{ row.name }}
            <div
              v-if="row.status === 'BLOCKED'"
              class="gmeta doc-blocked"
            >
              {{ row.error ?? row.recipient }}
              <button
                type="button"
                class="lnk"
                @click="emit('openBilling')"
              >
                {{ t('bookings.docBillingLink') }}
              </button>
            </div>
            <div
              v-else
              class="gmeta"
            >
              {{ t('bookings.docTo', { recipient: row.recipient }) }}
            </div>
            <div
              v-if="currentVersionLabel(row) !== ''"
              class="gmeta"
            >
              {{ currentVersionLabel(row) }}
            </div>
            <ul
              v-if="earlierVersions(row).length > 0"
              class="doc-versions"
            >
              <li
                v-for="document in earlierVersions(row)"
                :key="document.id"
              >
                <button
                  type="button"
                  class="lnk"
                  @click="openIssuedPreview(document)"
                >
                  {{ versionLabel(document) }}
                </button>
              </li>
            </ul>
            <div
              v-if="row.status === 'FAILED' && row.error"
              class="gmeta doc-error"
            >
              {{ row.error }}
            </div>
          </td>
          <td class="doc-trigger">
            {{ row.trigger }}
          </td>
          <td class="nw">
            {{ rowDate(row) }}
          </td>
          <td>
            <span
              class="pill"
              :class="documentStatusPillClass(row.status)"
            >{{ row.status }}</span>
          </td>
          <td>
            <button
              v-if="documentRowActions(row).preview"
              type="button"
              class="mini"
              @click="openPreview(row)"
            >
              {{ t('bookings.docPreview') }}
            </button>
            <button
              v-if="documentRowActions(row).resend"
              type="button"
              class="mini"
              @click="startResend(row)"
            >
              {{ t('bookings.docResend') }}
            </button>
            <button
              v-if="documentRowActions(row).issue"
              type="button"
              class="mini"
              @click="startIssue(row)"
            >
              {{ row.version === null ? t('bookings.docIssue') : t('bookings.docReissue') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <DocumentPreviewModal
    v-model:open="previewOpen"
    :title="preview?.title ?? ''"
    :html-path="preview?.htmlPath ?? null"
    :file-path="preview?.filePath ?? null"
    :file-name="preview?.fileName ?? ''"
  />

  <DocumentConfirmModal
    v-model:open="resendOpen"
    :title="t('bookings.docResendTitle')"
    :body="resendBody"
    :submitting="resendSubmitting"
    :error="resendError"
    :confirm-label="t('bookings.docResend')"
    @confirm="submitResend"
  />

  <ReasonModal
    v-model:open="reasonOpen"
    :title="t('bookings.docReissueTitle')"
    hint="required"
    :submitting="reasonSubmitting"
    :error="reasonError"
    @submit="submitReissue"
  />
</template>
