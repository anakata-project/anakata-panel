import type { SlaDisplay } from '../requests/requestHelpers'

export function refundSlaDisplay(remaining: number, breached: boolean): SlaDisplay {
  if (breached) {
    return { tone: 'bad', text: 'SLA BREACH' }
  }

  if (remaining === 1) {
    return { tone: 'ok', text: '1 BUSINESS DAY' }
  }

  return { tone: 'ok', text: `${String(remaining)} BUSINESS DAYS` }
}
