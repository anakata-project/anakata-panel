<script setup lang="ts">
import { downloadDocumentFile, fetchDocumentHtml } from './documentFetch'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  title: string
  htmlPath: string | null
  filePath: string | null
  fileName: string
}>()

const { t } = useI18n()
const toast = useToast()

const iframe = ref<HTMLIFrameElement | null>(null)
const html = ref('')
const loading = ref(false)
const error = ref('')
const downloading = ref(false)

async function loadHtml(): Promise<void> {
  if (!open.value || props.htmlPath === null) {
    html.value = ''
    error.value = ''
    return
  }

  loading.value = true
  error.value = ''
  html.value = ''

  try {
    html.value = await fetchDocumentHtml(props.htmlPath)
  } catch (caught: unknown) {
    error.value = caught instanceof Error ? caught.message : t('bookings.docPreviewFailed')
  } finally {
    loading.value = false
  }
}

watch(
  () => [open.value, props.htmlPath] as const,
  () => {
    void loadHtml()
  }
)

function printDocument(): void {
  iframe.value?.contentWindow?.print()
}

async function downloadPdf(): Promise<void> {
  if (props.filePath === null) {
    return
  }

  downloading.value = true

  try {
    await downloadDocumentFile(props.filePath, props.fileName)
  } catch (caught: unknown) {
    toast.add({
      title: caught instanceof Error ? caught.message : t('bookings.docDownloadFailed')
    })
  } finally {
    downloading.value = false
  }
}
</script>

<template>
  <UModal
    :open="open"
    class="doc-modal"
    @update:open="open = $event"
  >
    <template #content>
      <div class="docbox">
        <div class="docbar">
          <h2>{{ title }}</h2>
          <div class="docbar-acts">
            <UButton
              variant="outline"
              :disabled="html === '' || loading"
              @click="printDocument"
            >
              {{ t('bookings.docPrint') }}
            </UButton>
            <UButton
              v-if="filePath !== null"
              variant="outline"
              :loading="downloading"
              :disabled="downloading"
              @click="downloadPdf"
            >
              {{ t('bookings.docDownload') }}
            </UButton>
            <UButton
              variant="outline"
              @click="open = false"
            >
              {{ t('bookings.close') }}
            </UButton>
          </div>
        </div>
        <p
          v-if="loading"
          class="note"
        >
          {{ t('bookings.docPreviewLoading') }}
        </p>
        <div
          v-else-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <iframe
          v-else-if="html !== ''"
          ref="iframe"
          class="doc-frame"
          sandbox="allow-same-origin allow-modals"
          :srcdoc="html"
          title="document"
        />
      </div>
    </template>
  </UModal>
</template>
