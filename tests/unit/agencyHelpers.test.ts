import { describe, expect, it } from 'vitest'
import {
  agencySlaDisplay,
  agencyStatusPill,
  agencyUserStatusLabel,
  bookingsCell,
  commissionPillClass,
  commissionStatusClass,
  countryName,
  materialKindKey,
  materialSizeLabel,
  portalActivityKey,
  portalUserActions
} from '../../app/components/agencies/agencyHelpers'

describe('agencySlaDisplay', () => {
  it('uses elapsed, limit and the API breach flag', () => {
    expect(agencySlaDisplay(0, 2, false)).toEqual({ tone: 'ok', text: '2 BUSINESS DAYS LEFT' })
    expect(agencySlaDisplay(1, 2, false)).toEqual({ tone: 'ok', text: '1 BUSINESS DAY LEFT' })
    expect(agencySlaDisplay(2, 2, true)).toEqual({ tone: 'bad', text: 'SLA BREACH' })
  })
})

describe('commissionPillClass', () => {
  it('marks rates above the API cap', () => {
    expect(commissionPillClass(10, 12)).toBe('')
    expect(commissionPillClass(12, 12)).toBe('')
    expect(commissionPillClass(15, 12)).toBe('p-over')
  })
})

describe('commissionStatusClass', () => {
  it('maps the five accrual statuses', () => {
    expect(commissionStatusClass('BLOCKED')).toBe('p-over')
    expect(commissionStatusClass('EARNED_ON_COMPLETION')).toBe('p-wait')
    expect(commissionStatusClass('PAYABLE')).toBe('p-pend')
    expect(commissionStatusClass('PAID')).toBe('p-full')
    expect(commissionStatusClass('CANCELLED')).toBe('p-canc')
  })
})

describe('agencyUserStatusLabel', () => {
  it('uses the API status labels', () => {
    expect(agencyUserStatusLabel('INVITE_ON_PORTAL_LAUNCH')).toBe('Invite on portal launch')
    expect(agencyUserStatusLabel('INVITE_ON_APPROVAL')).toBe('Invite on approval')
    expect(agencyUserStatusLabel('ACTIVE')).toBe('Active')
    expect(agencyUserStatusLabel('DISABLED')).toBe('Disabled')
  })
})

describe('portalUserActions', () => {
  it('reads the payload and does not invent an expiry', () => {
    expect(portalUserActions({ status: 'ACTIVE', invite_sent_at: null })).toEqual({
      state: 'active',
      canInvite: false,
      canResend: false,
      canDisable: true,
      canEnable: false
    })
    expect(portalUserActions({ status: 'DISABLED', invite_sent_at: '2026-09-01T00:00:00.000Z' })).toEqual({
      state: 'disabled',
      canInvite: false,
      canResend: false,
      canDisable: false,
      canEnable: true
    })
    expect(portalUserActions({
      status: 'INVITE_ON_PORTAL_LAUNCH',
      invite_sent_at: '2026-09-01T00:00:00.000Z'
    })).toEqual({
      state: 'invited',
      canInvite: false,
      canResend: true,
      canDisable: false,
      canEnable: false
    })
    expect(portalUserActions({ status: 'INVITE_ON_APPROVAL', invite_sent_at: null })).toEqual({
      state: 'pending',
      canInvite: true,
      canResend: false,
      canDisable: false,
      canEnable: false
    })
  })
})

describe('material size and activity labels', () => {
  it('formats bytes and maps the four portal events', () => {
    expect(materialSizeLabel(0)).toBe('0 B')
    expect(materialSizeLabel(512)).toBe('512 B')
    expect(materialSizeLabel(1024)).toBe('1 KB')
    expect(materialSizeLabel(1536)).toBe('2 KB')
    expect(materialSizeLabel(1024 * 1024)).toBe('1 MB')
    expect(materialSizeLabel(50 * 1024 * 1024)).toBe('50 MB')
    expect(materialKindKey('FACT_SHEET')).toBe('agencies.kindFactSheet')
    expect(portalActivityKey('portal.signed_in')).toBe('agencies.activitySignedIn')
    expect(portalActivityKey('portal.sign_in_failed')).toBe('agencies.activitySignInFailed')
    expect(portalActivityKey('portal.request_created')).toBe('agencies.activityRequestCreated')
    expect(portalActivityKey('portal.material_downloaded')).toBe('agencies.activityDownloaded')
    expect(portalActivityKey('portal.signed_out')).toBeNull()
  })
})

describe('countryName and bookingsCell', () => {
  it('resolves prototype country labels and held counts', () => {
    expect(countryName('CL')).toBe('Chile')
    expect(countryName(null)).toBe('—')
    expect(bookingsCell(2, 0)).toBe('2')
    expect(bookingsCell(2, 1)).toBe('1 + 1 held')
    expect(agencyStatusPill('APPROVED')).toBe('p-conf')
    expect(agencyStatusPill('REJECTED')).toBe('p-canc')
    expect(agencyStatusPill('PENDING')).toBe('p-pend')
  })
})
