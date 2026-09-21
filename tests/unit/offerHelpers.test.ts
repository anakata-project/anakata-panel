import { describe, expect, it } from 'vitest'
import type { Offer } from '../../app/types/api'
import {
  compactOfferWindow,
  emptyOfferForm,
  formFromOffer,
  offerFormToPayload,
  offerStatusPillClass
} from '../../app/components/offers/offerHelpers'

function sampleOffer(overrides: Partial<Offer> = {}): Offer {
  return {
    id: 1,
    reference: 'OF-001',
    code: 'OPENING-27',
    name: 'Opening season credit',
    type: 'CREDIT',
    value: 500,
    value_text: null,
    channel: 'D2C',
    partner: null,
    cabin_types: ['SUITE'],
    itinerary_codes: ['WEST'],
    booking_from: null,
    booking_to: null,
    travel_from: '2027-11-01',
    travel_to: '2027-12-31',
    combinable: false,
    is_promo_code: false,
    badge: 'OPENING OFFER',
    show_on_card: true,
    show_on_departures: true,
    price_line: 'Opening season credit',
    terms: 'Terms.',
    status: 'LIVE',
    stored_status: 'LIVE',
    approved_by: null,
    approved_at: null,
    approval_reason: null,
    benefit_label: 'USD 500 ancillary credit / cabin',
    scope_label: 'D2C · Suites · Western Realm',
    booking_window_label: 'Any',
    travel_window_label: '1 Nov 2027 → 31 Dec 2027',
    engine_placement: 'badge',
    live_departures_count: 2,
    ...overrides
  }
}

describe('offerHelpers', () => {
  it('maps offer status to prototype pill classes', () => {
    expect(offerStatusPillClass('DRAFT')).toBe('p-pend')
    expect(offerStatusPillClass('PENDING')).toBe('p-hold')
    expect(offerStatusPillClass('LIVE')).toBe('p-conf')
    expect(offerStatusPillClass('PAUSED')).toBe('p-comp')
    expect(offerStatusPillClass('EXPIRED')).toBe('p-wait')
    expect(offerStatusPillClass('UNKNOWN')).toBe('')
  })

  it('uppercases the code and turns empty optionals into null', () => {
    const form = emptyOfferForm(['WEST'])
    form.code = ' opening-27 '
    form.name = ' Opening '
    form.partner = '  '
    form.badge = 'OPENING'
    form.value = 500
    form.booking_from = ''
    form.travel_from = '2027-11-01'

    expect(offerFormToPayload(form, true)).toEqual({
      code: 'OPENING-27',
      name: 'Opening',
      type: 'CREDIT',
      value: 500,
      value_text: null,
      channel: 'D2C',
      partner: null,
      cabin_types: ['SUITE'],
      itinerary_codes: ['WEST'],
      booking_from: null,
      booking_to: null,
      travel_from: '2027-11-01',
      travel_to: null,
      combinable: false,
      is_promo_code: false,
      badge: 'OPENING',
      show_on_card: true,
      show_on_departures: true,
      price_line: null,
      terms: null,
      as_draft: true
    })
  })

  it('round-trips an offer into the save payload without changing shape rules', () => {
    const payload = offerFormToPayload(formFromOffer(sampleOffer()), false)

    expect(payload.code).toBe('OPENING-27')
    expect(payload.as_draft).toBe(false)
    expect(payload.cabin_types).toEqual(['SUITE'])
    expect(payload.travel_from).toBe('2027-11-01')
    expect(payload.booking_from).toBeNull()
  })

  it('uses the API travel window label when it is not Any', () => {
    expect(compactOfferWindow(sampleOffer())).toBe('1 Nov 2027 → 31 Dec 2027')
    expect(compactOfferWindow(sampleOffer({
      travel_window_label: 'Any',
      booking_window_label: '1 Jan 2027 → 31 Mar 2027'
    }))).toBe('1 Jan 2027 → 31 Mar 2027')
  })
})
