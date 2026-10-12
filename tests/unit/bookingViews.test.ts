import { describe, expect, it } from 'vitest'
import {
  BOOKING_VIEW_IDS,
  DEAL_VIEW_IDS,
  bookingWindowParams,
  viewFromQuery
} from '../../app/components/bookings/bookingViews'

describe('viewFromQuery', () => {
  it('keeps an allowed booking view and falls back otherwise', () => {
    expect(viewFromQuery('requests', BOOKING_VIEW_IDS, 'all')).toBe('requests')
    expect(viewFromQuery(['contacts-in'], BOOKING_VIEW_IDS, 'all')).toBe('contacts-in')
    expect(viewFromQuery('board', BOOKING_VIEW_IDS, 'all')).toBe('all')
    expect(viewFromQuery(undefined, BOOKING_VIEW_IDS, 'all')).toBe('all')
  })

  it('keeps an allowed deals view', () => {
    expect(viewFromQuery('table', DEAL_VIEW_IDS, 'board')).toBe('table')
    expect(viewFromQuery('nope', DEAL_VIEW_IDS, 'board')).toBe('board')
  })
})

describe('bookingWindowParams', () => {
  it('omits an open end of the range', () => {
    expect(bookingWindowParams(null, null).toString()).toBe('')
    expect(bookingWindowParams('2026-10-01', null).get('from')).toBe('2026-10-01')
    expect(bookingWindowParams('2026-10-01', null).has('to')).toBe(false)
    expect(bookingWindowParams('2026-10-01', '2026-10-31').toString()).toBe('from=2026-10-01&to=2026-10-31')
  })
})
