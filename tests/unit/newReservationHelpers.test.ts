import { describe, expect, it } from 'vitest'
import {
  charterNoticeText,
  createdToast,
  depositLineText,
  existingContactSelected,
  isTradeMain,
  quoteRequestPayload,
  showBackToBack,
  showGroupNameField,
  showGroupRow
} from '../../app/components/bookings/newReservationHelpers'

const MAIN = [
  { value: 'D2C', label: 'D2C', trade: false },
  { value: 'B2B', label: 'B2B', trade: true },
  { value: 'Partners', label: 'Partners', trade: false }
]

describe('newReservationHelpers', () => {
  it('builds a charter payload as one party with no cabin code', () => {
    expect(quoteRequestPayload(12, 'CHARTER', [
      { cabinCode: 'S1', adults: 8, children: 1 }
    ], false)).toEqual({
      departure_id: 12,
      type: 'CHARTER',
      back_to_back: false,
      cabins: [{ adults: 8, children: 1 }]
    })
  })

  it('builds cabin rows only when every cabin is picked', () => {
    expect(quoteRequestPayload(12, 'CABIN', [
      { cabinCode: 'S1', adults: 2, children: 0 }
    ], true)).toEqual({
      departure_id: 12,
      type: 'CABIN',
      back_to_back: true,
      cabins: [{ cabin_code: 'S1', adults: 2, children: 0 }]
    })

    expect(quoteRequestPayload(12, 'CABIN', [
      { cabinCode: 'S1', adults: 2, children: 0 },
      { cabinCode: '', adults: 2, children: 0 }
    ], false)).toBeNull()

    expect(quoteRequestPayload(null, 'CABIN', [
      { cabinCode: 'S1', adults: 2, children: 0 }
    ], false)).toBeNull()
  })

  it('shows the group row for two cabins or an existing group', () => {
    expect(showGroupRow(false, 1, null)).toBe(false)
    expect(showGroupRow(false, 2, null)).toBe(true)
    expect(showGroupRow(false, 1, 9)).toBe(true)
    expect(showGroupRow(true, 3, 9)).toBe(false)
    expect(showGroupNameField(null)).toBe(true)
    expect(showGroupNameField(4)).toBe(false)
  })

  it('hides back-to-back for charter and festive departures', () => {
    expect(showBackToBack(false, false)).toBe(true)
    expect(showBackToBack(true, false)).toBe(false)
    expect(showBackToBack(false, true)).toBe(false)
    expect(showBackToBack(true, true)).toBe(false)
  })

  it('reads trade from the API flag, not a local regex', () => {
    expect(isTradeMain('B2B', MAIN)).toBe(true)
    expect(isTradeMain('D2C', MAIN)).toBe(false)
    expect(isTradeMain('Partners', MAIN)).toBe(false)
  })

  it('wording for one cabin versus a group', () => {
    expect(createdToast([
      { reference: 'ANK-2026-0020', display_reference: 'ANK-2026-0020' }
    ], null)).toBe('Reservation ANK-2026-0020 created.')

    expect(createdToast([
      { reference: 'ANK-2026-0020', display_reference: 'ANK-2026-0020' },
      { reference: 'ANK-2026-0021', display_reference: 'ANK-2026-0021' },
      { reference: 'ANK-2026-0022', display_reference: 'ANK-2026-0022' }
    ], 'GRP-008')).toBe(
      '3 cabins created under GRP-008 (ANK-2026-0020, ANK-2026-0021, ANK-2026-0022). The coordinator receives all communications.'
    )
  })

  it('matches a selected contact only while the email still agrees', () => {
    expect(existingContactSelected('Ada@Anakata.test', 'ada@anakata.test')).toBe(true)
    expect(existingContactSelected('other@anakata.test', 'ada@anakata.test')).toBe(false)
    expect(existingContactSelected('ada@anakata.test', null)).toBe(false)
  })

  it('renders deposit and charter copy from quote terms', () => {
    expect(depositLineText(10, 'USD 2,660', 120)).toBe('Deposit 10% · USD 2,660 · balance at T−120')
    expect(charterNoticeText({
      deposit_pct: 20,
      deposit_business_days: 5,
      balance_days: 120,
      dpng_manifest_days: 30
    })).toBe(
      'CHARTER blocks the entire yacht for the departure. Deposit 20% within 5 business days of written confirmation; balance 80% at 120 days; DPNG manifest 30 days pre-departure.'
    )
  })
})
