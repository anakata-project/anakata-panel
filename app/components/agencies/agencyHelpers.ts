import type { AgencyStatus } from '../../types/api'
import type { SlaDisplay } from '../requests/requestHelpers'

export type AgencyCountry = {
  value: string
  label: string
}

export const AGENCY_COUNTRIES: Array<AgencyCountry> = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'MX', label: 'Mexico' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'IE', label: 'Ireland' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'ES', label: 'Spain' },
  { value: 'IT', label: 'Italy' },
  { value: 'PT', label: 'Portugal' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'BE', label: 'Belgium' },
  { value: 'CH', label: 'Switzerland' },
  { value: 'AT', label: 'Austria' },
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
  { value: 'PL', label: 'Poland' },
  { value: 'GR', label: 'Greece' },
  { value: 'IL', label: 'Israel' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'AU', label: 'Australia' },
  { value: 'NZ', label: 'New Zealand' },
  { value: 'JP', label: 'Japan' },
  { value: 'KR', label: 'South Korea' },
  { value: 'CN', label: 'China' },
  { value: 'HK', label: 'Hong Kong' },
  { value: 'SG', label: 'Singapore' },
  { value: 'IN', label: 'India' },
  { value: 'BR', label: 'Brazil' },
  { value: 'AR', label: 'Argentina' },
  { value: 'CL', label: 'Chile' },
  { value: 'UY', label: 'Uruguay' },
  { value: 'PY', label: 'Paraguay' },
  { value: 'CO', label: 'Colombia' },
  { value: 'PE', label: 'Peru' },
  { value: 'BO', label: 'Bolivia' },
  { value: 'EC', label: 'Ecuador' },
  { value: 'XX', label: 'Other' }
]

export function agencySlaDisplay(elapsed: number, limit: number, breached: boolean): SlaDisplay {
  if (breached) {
    return { tone: 'bad', text: 'SLA BREACH' }
  }

  const left = Math.max(0, limit - elapsed)

  if (left === 1) {
    return { tone: 'ok', text: '1 BUSINESS DAY LEFT' }
  }

  return { tone: 'ok', text: `${String(left)} BUSINESS DAYS LEFT` }
}

export function commissionPillClass(rate: number, cap: number): string {
  return rate > cap ? 'p-over' : ''
}

export function countryName(code: string | null): string {
  if (code === null || code === '') {
    return '—'
  }

  return AGENCY_COUNTRIES.find(item => item.value === code)?.label ?? code
}

export function agencyStatusPill(status: AgencyStatus): string {
  if (status === 'APPROVED') {
    return 'p-conf'
  }

  if (status === 'REJECTED') {
    return 'p-canc'
  }

  return 'p-pend'
}

export function bookingsCell(count: number, held: number): string {
  const sold = count - held

  if (held <= 0) {
    return String(count)
  }

  return `${String(sold)} + ${String(held)} held`
}
