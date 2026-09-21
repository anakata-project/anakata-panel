import { describe, expect, it } from 'vitest'
import { filenameFromDisposition } from '../../app/components/documents/documentFetch'

describe('filenameFromDisposition', () => {
  it('reads a quoted filename and falls back', () => {
    expect(filenameFromDisposition('attachment; filename="INVOICE-v2.pdf"', 'x.pdf')).toBe('INVOICE-v2.pdf')
    expect(filenameFromDisposition('attachment; filename=INVOICE-v1.pdf', 'x.pdf')).toBe('INVOICE-v1.pdf')
    expect(filenameFromDisposition(null, 'fallback.pdf')).toBe('fallback.pdf')
  })
})
