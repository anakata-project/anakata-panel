import type {
  CabinCategory,
  Offer,
  OfferChannel,
  OfferStatus,
  OfferType,
  StoreOfferRequest
} from '../../types/api'

export type OfferForm = {
  code: string
  name: string
  type: OfferType
  value: number | null
  value_text: string
  channel: OfferChannel
  partner: string
  cabin_types: Array<CabinCategory>
  itinerary_codes: Array<string>
  booking_from: string
  booking_to: string
  travel_from: string
  travel_to: string
  combinable: boolean
  is_promo_code: boolean
  badge: string
  show_on_card: boolean
  show_on_departures: boolean
  price_line: string
  terms: string
}

export const OFFER_TYPES: Array<OfferType> = ['CREDIT', 'AMT', 'PCT', 'VALUE', 'COMM']
export const OFFER_CHANNELS: Array<OfferChannel> = ['D2C', 'B2B', 'ALL']
export const OFFER_CABIN_TYPES: Array<CabinCategory> = ['SUITE', 'OWNER']

export function offerStatusPillClass(status: OfferStatus | string): string {
  if (status === 'DRAFT') {
    return 'p-pend'
  }

  if (status === 'PENDING') {
    return 'p-hold'
  }

  if (status === 'LIVE') {
    return 'p-conf'
  }

  if (status === 'PAUSED') {
    return 'p-comp'
  }

  if (status === 'EXPIRED') {
    return 'p-wait'
  }

  return ''
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()

  return trimmed === '' ? null : trimmed
}

export function offerFormToPayload(form: OfferForm, asDraft: boolean): StoreOfferRequest {
  return {
    code: form.code.trim().toUpperCase(),
    name: form.name.trim(),
    type: form.type,
    value: form.value,
    value_text: blankToNull(form.value_text),
    channel: form.channel,
    partner: blankToNull(form.partner),
    cabin_types: [...form.cabin_types],
    itinerary_codes: [...form.itinerary_codes],
    booking_from: blankToNull(form.booking_from),
    booking_to: blankToNull(form.booking_to),
    travel_from: blankToNull(form.travel_from),
    travel_to: blankToNull(form.travel_to),
    combinable: form.combinable,
    is_promo_code: form.is_promo_code,
    badge: blankToNull(form.badge),
    show_on_card: form.show_on_card,
    show_on_departures: form.show_on_departures,
    price_line: blankToNull(form.price_line),
    terms: blankToNull(form.terms),
    as_draft: asDraft
  }
}

export function emptyOfferForm(itineraryCodes: Array<string> = []): OfferForm {
  return {
    code: '',
    name: '',
    type: 'CREDIT',
    value: 0,
    value_text: '',
    channel: 'D2C',
    partner: '',
    cabin_types: ['SUITE'],
    itinerary_codes: [...itineraryCodes],
    booking_from: '',
    booking_to: '',
    travel_from: '',
    travel_to: '',
    combinable: false,
    is_promo_code: false,
    badge: '',
    show_on_card: true,
    show_on_departures: true,
    price_line: '',
    terms: ''
  }
}

export function formFromOffer(offer: Offer): OfferForm {
  return {
    code: offer.code,
    name: offer.name,
    type: offer.type,
    value: offer.value,
    value_text: offer.value_text ?? '',
    channel: offer.channel,
    partner: offer.partner ?? '',
    cabin_types: [...offer.cabin_types] as Array<CabinCategory>,
    itinerary_codes: [...offer.itinerary_codes],
    booking_from: offer.booking_from ?? '',
    booking_to: offer.booking_to ?? '',
    travel_from: offer.travel_from ?? '',
    travel_to: offer.travel_to ?? '',
    combinable: offer.combinable,
    is_promo_code: offer.is_promo_code,
    badge: offer.badge ?? '',
    show_on_card: offer.show_on_card,
    show_on_departures: offer.show_on_departures,
    price_line: offer.price_line ?? '',
    terms: offer.terms ?? ''
  }
}

export function compactOfferWindow(offer: Offer): string {
  if (offer.travel_window_label !== 'Any') {
    return offer.travel_window_label
  }

  return offer.booking_window_label
}
