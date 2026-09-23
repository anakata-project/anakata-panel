import type { AgencyStatus, AgencyUserStatus, CommissionStatus, SalesMaterialKind } from '../../types/api'
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

export function commissionStatusClass(status: CommissionStatus): string {
  if (status === 'BLOCKED') {
    return 'p-over'
  }

  if (status === 'EARNED_ON_COMPLETION') {
    return 'p-wait'
  }

  if (status === 'PAYABLE') {
    return 'p-pend'
  }

  if (status === 'PAID') {
    return 'p-full'
  }

  return 'p-canc'
}

export function agencyUserStatusLabel(status: AgencyUserStatus): string {
  if (status === 'INVITE_ON_PORTAL_LAUNCH') {
    return 'Invite on portal launch'
  }

  if (status === 'INVITE_ON_APPROVAL') {
    return 'Invite on approval'
  }

  if (status === 'ACTIVE') {
    return 'Active'
  }

  return 'Disabled'
}

export type PortalUserState = 'active' | 'disabled' | 'invited' | 'pending'

export type PortalUserActions = {
  state: PortalUserState
  canInvite: boolean
  canResend: boolean
  canDisable: boolean
  canEnable: boolean
}

export function portalUserActions(user: {
  status: AgencyUserStatus
  invite_sent_at: string | null
}): PortalUserActions {
  if (user.status === 'ACTIVE') {
    return {
      state: 'active',
      canInvite: false,
      canResend: false,
      canDisable: true,
      canEnable: false
    }
  }

  if (user.status === 'DISABLED') {
    return {
      state: 'disabled',
      canInvite: false,
      canResend: false,
      canDisable: false,
      canEnable: true
    }
  }

  if (user.invite_sent_at !== null) {
    return {
      state: 'invited',
      canInvite: false,
      canResend: true,
      canDisable: false,
      canEnable: false
    }
  }

  return {
    state: 'pending',
    canInvite: true,
    canResend: false,
    canDisable: false,
    canEnable: false
  }
}

export const SALES_MATERIAL_KINDS: Array<SalesMaterialKind> = [
  'FACT_SHEET',
  'BRAND_DECK',
  'PHOTOGRAPHY',
  'ITINERARY_PDF',
  'VIDEO',
  'OTHER'
]

const MATERIAL_KIND_KEYS: Record<SalesMaterialKind, string> = {
  FACT_SHEET: 'agencies.kindFactSheet',
  BRAND_DECK: 'agencies.kindBrandDeck',
  PHOTOGRAPHY: 'agencies.kindPhotography',
  ITINERARY_PDF: 'agencies.kindItineraryPdf',
  VIDEO: 'agencies.kindVideo',
  OTHER: 'agencies.kindOther'
}

export function materialKindKey(kind: SalesMaterialKind): string {
  return MATERIAL_KIND_KEYS[kind]
}

export function materialSizeLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${String(bytes)} B`
  }

  if (bytes < 1024 * 1024) {
    return `${String(Math.round(bytes / 1024))} KB`
  }

  const tenths = Math.round((bytes * 10) / (1024 * 1024))
  const whole = Math.floor(tenths / 10)
  const fraction = tenths % 10

  if (fraction === 0) {
    return `${String(whole)} MB`
  }

  return `${String(whole)}.${String(fraction)} MB`
}

const ACTIVITY_KEYS: Record<string, string> = {
  'portal.signed_in': 'agencies.activitySignedIn',
  'portal.sign_in_failed': 'agencies.activitySignInFailed',
  'portal.request_created': 'agencies.activityRequestCreated',
  'portal.material_downloaded': 'agencies.activityDownloaded'
}

export function portalActivityKey(event: string): string | null {
  return ACTIVITY_KEYS[event] ?? null
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
