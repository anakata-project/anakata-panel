import type { DocumentPlanRow, DocumentStatus, IssuedDocument } from '../../types/api'

export type DocumentRowActions = {
  preview: boolean
  issue: boolean
  resend: boolean
}

export type DocumentPreviewTarget = {
  title: string
  htmlPath: string
  filePath: string | null
  fileName: string
}

export function previewTargetFor(
  row: Pick<DocumentPlanRow, 'booking_id' | 'kind' | 'name' | 'document_id' | 'payment_id' | 'version'>
): DocumentPreviewTarget {
  if (row.document_id !== null) {
    const version = row.version ?? 1

    return {
      title: row.name,
      htmlPath: `/api/rms/documents/${String(row.document_id)}/html`,
      filePath: `/api/rms/documents/${String(row.document_id)}/file`,
      fileName: `${row.kind}-v${String(version)}.pdf`
    }
  }

  if (row.kind === 'RECEIPT' && row.payment_id !== null) {
    return {
      title: row.name,
      htmlPath: `/api/rms/bookings/${String(row.booking_id)}/receipts/${String(row.payment_id)}/html`,
      filePath: null,
      fileName: ''
    }
  }

  return {
    title: row.name,
    htmlPath: `/api/rms/bookings/${String(row.booking_id)}/documents/${row.kind}/html`,
    filePath: null,
    fileName: ''
  }
}

export function documentStatusPillClass(status: DocumentStatus | string): string {
  if (status === 'SENT') {
    return 'p-conf'
  }

  if (status === 'SCHEDULED') {
    return 'p-pend'
  }

  if (status === 'WAITING') {
    return 'p-wait'
  }

  if (status === 'NOT NEEDED' || status === 'NOT CONTRACTED') {
    return 'p-comp'
  }

  if (status === 'BLOCKED' || status === 'FAILED') {
    return 'p-canc'
  }

  if (status === 'DUE') {
    return 'p-hold'
  }

  return ''
}

export function documentRowActions(
  row: Pick<DocumentPlanRow, 'can_preview' | 'can_issue' | 'can_resend'>
): DocumentRowActions {
  return {
    preview: row.can_preview,
    issue: row.can_issue,
    resend: row.can_resend
  }
}

export function versionLabel(document: Pick<IssuedDocument, 'version' | 'reason'>): string {
  if (document.reason !== null && document.reason !== '') {
    return `v${String(document.version)} · ${document.reason}`
  }

  return `v${String(document.version)}`
}

export function invoiceHasBeenIssued(
  rows: Array<Pick<DocumentPlanRow, 'kind' | 'document_id'>>
): boolean {
  return rows.some(row => row.kind === 'INVOICE' && row.document_id !== null)
}

export function issuedVersionsFor(
  row: Pick<DocumentPlanRow, 'kind' | 'payment_id' | 'document_id'>,
  documents: Array<IssuedDocument>
): Array<IssuedDocument> {
  return documents.filter((document) => {
    if (row.kind === 'RECEIPT') {
      return document.kind === 'RECEIPT' && document.payment_id === row.payment_id
    }

    return document.kind === row.kind
  })
}
