import { describe, expect, it } from 'vitest'
import type { Booking, PaymentOption } from '../../app/types/api'
import {
  defaultPaymentAmount,
  labelFrom,
  overdueNotice,
  paymentStatusPillClass,
  recordableOptions,
  signedMoney
} from '../../app/components/payments/paymentHelpers'

function money(usd: number): string {
  return `USD ${usd.toLocaleString('en-US')}`
}

const kinds: Array<PaymentOption> = [
  { value: 'DEPOSIT', label: 'Deposit', recordable: true },
  { value: 'BALANCE', label: 'Balance', recordable: true },
  { value: 'REFUND', label: 'Refund', recordable: false }
]

describe('paymentHelpers', () => {
  it('looks up labels and falls back to the raw value', () => {
    expect(labelFrom(kinds, 'DEPOSIT')).toBe('Deposit')
    expect(labelFrom(kinds, 'REFUND')).toBe('Refund')
    expect(labelFrom([], 'DEPOSIT')).toBe('DEPOSIT')
  })

  it('keeps only recordable options for the form', () => {
    expect(recordableOptions(kinds).map(item => item.value)).toEqual(['DEPOSIT', 'BALANCE'])
  })

  it('maps status pills only', () => {
    expect(paymentStatusPillClass('SETTLED')).toBe('p-conf')
    expect(paymentStatusPillClass('AWAITING_WIRE')).toBe('p-pend')
    expect(paymentStatusPillClass('REFUNDED')).toBe('p-canc')
    expect(paymentStatusPillClass('OTHER')).toBe('')
  })

  it('formats refunds with a minus and leaves positives unchanged', () => {
    expect(signedMoney(-1330, money)).toBe('−USD 1,330')
    expect(signedMoney(2660, money)).toBe('USD 2,660')
  })

  it('builds the OPS-007 overdue sentence from API numbers', () => {
    expect(overdueNotice(12, 23940, money)).toBe(
      'Balance overdue by 12 days — USD 23,940. OPS-007: the team decides; nothing is cancelled automatically.'
    )
  })

  it('prefills deposit when nothing is paid, otherwise the balance', () => {
    const unpaid = { paid: 0, deposit_amount: 2660, balance: 26600 } as Booking
    const partial = { paid: 2660, deposit_amount: 2660, balance: 23940 } as Booking

    expect(defaultPaymentAmount(unpaid)).toBe(2660)
    expect(defaultPaymentAmount(partial)).toBe(23940)
  })
})
