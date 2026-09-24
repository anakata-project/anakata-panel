import { describe, expect, it } from 'vitest'
import { canDropOn, relativeDue, SELECT_ALL, slaBadge, taskPriorityClass, withSelectAll } from '../../app/components/crm/salesHelpers'

describe('slaBadge', () => {
  it('maps API states to the prototype badges', () => {
    expect(slaBadge('ok')).toBe('IN SLA')
    expect(slaBadge('warn')).toBe('NEAR SLA')
    expect(slaBadge('bad')).toBe('SLA BREACH')
    expect(slaBadge(null)).toBeNull()
    expect(slaBadge('other')).toBeNull()
  })
})

describe('taskPriorityClass', () => {
  it('keeps the API priority as the colour class', () => {
    expect(taskPriorityClass('bad')).toBe('bad')
    expect(taskPriorityClass('warn')).toBe('warn')
    expect(taskPriorityClass('ok')).toBe('ok')
    expect(taskPriorityClass('later')).toBe('ok')
  })
})

describe('canDropOn', () => {
  it('allows a movable card onto stages 1–4 and LOST', () => {
    const card = { may_move: true }

    expect(canDropOn('NEW_LEAD', card)).toBe(true)
    expect(canDropOn('QUALIFYING', card)).toBe(true)
    expect(canDropOn('QUOTED', card)).toBe(true)
    expect(canDropOn('NEGOTIATION', card)).toBe(true)
    expect(canDropOn('LOST', card)).toBe(true)
  })

  it('refuses locked cards and stages the booking owns', () => {
    expect(canDropOn('QUALIFYING', { may_move: false })).toBe(false)
    expect(canDropOn('DEPOSIT_PENDING', { may_move: true })).toBe(false)
    expect(canDropOn('BOOKING_CONFIRMED', { may_move: true })).toBe(false)
    expect(canDropOn('WON_COMPLETED', { may_move: true })).toBe(false)
  })
})

describe('withSelectAll', () => {
  it('prefixes All with a non-empty value (Reka SelectItem forbids "")', () => {
    const items = withSelectAll('All owners', [{ label: 'Me', value: 'me' }])

    expect(SELECT_ALL).not.toBe('')
    expect(items.map(item => item.value)).toEqual([SELECT_ALL, 'me'])
    expect(items.every(item => item.value !== '')).toBe(true)
  })
})

describe('relativeDue', () => {
  it('labels a past due and a due within a day', () => {
    const now = Date.parse('2026-09-22T12:00:00Z')

    expect(relativeDue('2026-09-22T11:00:00Z', now)).toBe('OVERDUE')
    expect(relativeDue('2026-09-22T18:00:00Z', now)).toBe('TODAY')
    expect(relativeDue('2026-09-24T12:00:00Z', now)).toBe('2026-09-24')
    expect(relativeDue('not-a-date', now)).toBe('not-a-date')
  })
})
