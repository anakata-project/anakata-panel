import type { Booking, PaymentOption, PaymentStatus } from '../../types/api'

export type LabeledOption = {
  value: string
  label: string
}

export function labelFrom(options: Array<LabeledOption>, value: string): string {
  return options.find(item => item.value === value)?.label ?? value
}

export function recordableOptions(options: Array<PaymentOption>): Array<PaymentOption> {
  return options.filter(item => item.recordable)
}

export function paymentStatusPillClass(status: PaymentStatus | string): string {
  if (status === 'SETTLED') {
    return 'p-conf'
  }

  if (status === 'AWAITING_WIRE') {
    return 'p-pend'
  }

  if (status === 'REFUNDED') {
    return 'p-canc'
  }

  return ''
}

export function signedMoney(amount: number, format: (usd: number) => string): string {
  if (amount < 0) {
    return `−${format(Math.abs(amount))}`
  }

  return format(amount)
}

export function overdueNotice(
  overdueDays: number,
  balance: number,
  format: (usd: number) => string
): string {
  return `Balance overdue by ${String(overdueDays)} days — ${format(balance)}. OPS-007: the team decides; nothing is cancelled automatically.`
}

export function defaultPaymentAmount(booking: Pick<Booking, 'paid' | 'deposit_amount' | 'balance'>): number {
  return booking.paid === 0 ? booking.deposit_amount : booking.balance
}
