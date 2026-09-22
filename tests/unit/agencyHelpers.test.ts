import { describe, expect, it } from 'vitest'
import {
  agencySlaDisplay,
  agencyStatusPill,
  agencyUserStatusLabel,
  bookingsCell,
  commissionPillClass,
  commissionStatusClass,
  countryName
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
