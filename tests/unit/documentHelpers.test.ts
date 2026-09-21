import { describe, expect, it } from 'vitest'
import type { DocumentPlanRow, IssuedDocument } from '../../app/types/api'
import {
  documentRowActions,
  documentStatusPillClass,
  invoiceHasBeenIssued,
  issuedVersionsFor,
  previewTargetFor,
  versionLabel
} from '../../app/components/documents/documentHelpers'

describe('documentHelpers', () => {
  it('maps the prototype DSTC pills and FAILED', () => {
    expect(documentStatusPillClass('SENT')).toBe('p-conf')
    expect(documentStatusPillClass('SCHEDULED')).toBe('p-pend')
    expect(documentStatusPillClass('WAITING')).toBe('p-wait')
    expect(documentStatusPillClass('NOT NEEDED')).toBe('p-comp')
    expect(documentStatusPillClass('NOT CONTRACTED')).toBe('p-comp')
    expect(documentStatusPillClass('BLOCKED')).toBe('p-canc')
    expect(documentStatusPillClass('FAILED')).toBe('p-canc')
    expect(documentStatusPillClass('DUE')).toBe('p-hold')
    expect(documentStatusPillClass('OTHER')).toBe('')
  })

  it('exposes buttons from can_* flags only', () => {
    expect(documentRowActions({
      can_preview: true,
      can_issue: false,
      can_resend: true
    })).toEqual({ preview: true, issue: false, resend: true })

    expect(documentRowActions({
      can_preview: false,
      can_issue: true,
      can_resend: false
    })).toEqual({ preview: false, issue: true, resend: false })
  })

  it('labels a version and optional reason', () => {
    expect(versionLabel({ version: 1, reason: null })).toBe('v1')
    expect(versionLabel({ version: 2, reason: 'Extra added' })).toBe('v2 · Extra added')
    expect(versionLabel({ version: 2, reason: '' })).toBe('v2')
  })

  it('treats an invoice as issued only when the plan row has a document_id', () => {
    const waiting = { kind: 'INVOICE', document_id: null } as Pick<DocumentPlanRow, 'kind' | 'document_id'>
    const issued = { kind: 'INVOICE', document_id: 12 } as Pick<DocumentPlanRow, 'kind' | 'document_id'>
    const summary = { kind: 'SUMMARY', document_id: 9 } as Pick<DocumentPlanRow, 'kind' | 'document_id'>

    expect(invoiceHasBeenIssued([waiting, summary])).toBe(false)
    expect(invoiceHasBeenIssued([issued])).toBe(true)
  })

  it('groups invoice versions by kind and receipts by payment', () => {
    const invoiceV2 = {
      id: 2,
      kind: 'INVOICE',
      payment_id: null,
      version: 2,
      reason: 'Extra added'
    } as IssuedDocument
    const invoiceV1 = {
      id: 1,
      kind: 'INVOICE',
      payment_id: null,
      version: 1,
      reason: null
    } as IssuedDocument
    const receipt = {
      id: 3,
      kind: 'RECEIPT',
      payment_id: 40,
      version: 1,
      reason: null
    } as IssuedDocument

    const invoiceRow = { kind: 'INVOICE', payment_id: null, document_id: 2 } as DocumentPlanRow
    const receiptRow = { kind: 'RECEIPT', payment_id: 40, document_id: 3 } as DocumentPlanRow

    expect(issuedVersionsFor(invoiceRow, [invoiceV2, invoiceV1, receipt]).map(item => item.id)).toEqual([2, 1])
    expect(issuedVersionsFor(receiptRow, [invoiceV2, receipt]).map(item => item.id)).toEqual([3])
  })

  it('builds preview URLs from the plan row', () => {
    expect(previewTargetFor({
      booking_id: 9,
      kind: 'INVOICE',
      name: 'Booking Confirmation & Invoice',
      document_id: 12,
      payment_id: null,
      version: 2
    })).toEqual({
      title: 'Booking Confirmation & Invoice',
      htmlPath: '/api/rms/documents/12/html',
      filePath: '/api/rms/documents/12/file',
      fileName: 'INVOICE-v2.pdf'
    })

    expect(previewTargetFor({
      booking_id: 9,
      kind: 'RECEIPT',
      name: 'Payment confirmation — Deposit',
      document_id: null,
      payment_id: 40,
      version: null
    })).toEqual({
      title: 'Payment confirmation — Deposit',
      htmlPath: '/api/rms/bookings/9/receipts/40/html',
      filePath: null,
      fileName: ''
    })

    expect(previewTargetFor({
      booking_id: 9,
      kind: 'SUMMARY',
      name: 'Booking Summary (guest version)',
      document_id: null,
      payment_id: null,
      version: null
    })).toEqual({
      title: 'Booking Summary (guest version)',
      htmlPath: '/api/rms/bookings/9/documents/SUMMARY/html',
      filePath: null,
      fileName: ''
    })
  })
})
