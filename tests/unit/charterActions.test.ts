import { describe, expect, it } from 'vitest'
import { charterActions } from '../../app/components/requests/charterActions'

describe('charter enquiry actions', () => {
  it('offers contacted and close from NEW, and issue before a decision', () => {
    expect(charterActions('NEW', false)).toEqual({
      contacted: true,
      issue: true,
      decline: false,
      close: true
    })
    expect(charterActions('CONTACTED', false).decline).toBe(false)
    expect(charterActions('QUOTED', false).decline).toBe(true)
  })

  it('does not close an accepted enquiry that already has a booking', () => {
    expect(charterActions('ACCEPTED', true).close).toBe(false)
    expect(charterActions('ACCEPTED', false).close).toBe(true)
    expect(charterActions('CLOSED', false)).toEqual({
      contacted: false,
      issue: false,
      decline: false,
      close: false
    })
  })
})
