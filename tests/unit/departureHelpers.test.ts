import { describe, expect, it } from 'vitest'
import {
  afterMutation,
  invBarWidths,
  labelToneClass,
  revertStatus,
  seasonDefaults
} from '../../app/components/departures/departureHelpers'

describe('departureHelpers', () => {
  it('computes invBar widths as a percentage of 9 cabins', () => {
    expect(invBarWidths({ sold: 2, held: 0, blocked: 0 })).toEqual({
      sold: '22.2%',
      held: '0.0%',
      blocked: '0.0%'
    })
    expect(invBarWidths({ sold: 1, held: 0, blocked: 2 })).toEqual({
      sold: '11.1%',
      held: '0.0%',
      blocked: '22.2%'
    })
  })

  it('maps every engine-label tone to a pill class', () => {
    expect(labelToneClass('conf')).toBe('p-conf')
    expect(labelToneClass('pend')).toBe('p-pend')
    expect(labelToneClass('wait')).toBe('p-wait')
    expect(labelToneClass('hold')).toBe('p-hold')
    expect(labelToneClass('canc')).toBe('p-canc')
    expect(labelToneClass('comp')).toBe('p-comp')
  })

  it('defaults generate-season dates to the next Sunday after the latest row, plus 12 weeks', () => {
    expect(seasonDefaults('2027-12-26', '2026-09-20')).toEqual({
      from: '2028-01-02',
      to: '2028-03-26'
    })
    expect(seasonDefaults(null, '2028-01-03')).toEqual({
      from: '2028-01-09',
      to: '2028-04-02'
    })
    expect(seasonDefaults(null, '2028-01-02')).toEqual({
      from: '2028-01-02',
      to: '2028-03-26'
    })
  })

  it('keeps the drawer open and adopts a new departure when the API returns warnings', () => {
    expect(afterMutation(true, [])).toEqual({ closeDrawer: true, adoptCreated: false })
    expect(afterMutation(false, [])).toEqual({ closeDrawer: true, adoptCreated: false })
    expect(afterMutation(true, ['ANATIVA\'s departure on 19 Dec 2027 is not festive.'])).toEqual({
      closeDrawer: false,
      adoptCreated: true
    })
    expect(afterMutation(false, ['This departure is festive but itinerary WEST is not.'])).toEqual({
      closeDrawer: false,
      adoptCreated: false
    })
  })

  it('reverts the status select when the immediate PATCH fails', () => {
    expect(revertStatus('ON_SALE', 'CLOSED', true)).toBe('CLOSED')
    expect(revertStatus('ON_SALE', 'CLOSED', false)).toBe('ON_SALE')
  })
})
