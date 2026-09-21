import { describe, expect, it } from 'vitest'
import { refundSlaDisplay } from '../../app/components/refunds/refundHelpers'

describe('refundSlaDisplay', () => {
  it('uses the API remaining count and breach flag', () => {
    expect(refundSlaDisplay(15, false)).toEqual({ tone: 'ok', text: '15 BUSINESS DAYS' })
    expect(refundSlaDisplay(1, false)).toEqual({ tone: 'ok', text: '1 BUSINESS DAY' })
    expect(refundSlaDisplay(0, true)).toEqual({ tone: 'bad', text: 'SLA BREACH' })
  })
})
