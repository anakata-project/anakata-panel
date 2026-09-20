import { describe, expect, it } from 'vitest'
import { roleDeleteTooltip, roleEllipsisTooltip } from '../../app/components/admin/roleMenu'

describe('roleEllipsisTooltip', () => {
  it('explains the dirty draft on the ··· button', () => {
    expect(roleEllipsisTooltip(true, 'Save or cancel your permission changes first'))
      .toBe('Save or cancel your permission changes first')
    expect(roleEllipsisTooltip(false, 'Save or cancel your permission changes first')).toBe('')
  })
})

describe('roleDeleteTooltip', () => {
  const deleteBlocked = 'Move its 1 users to another role first'

  it('puts the blocked-delete reason on Delete when the role still has users', () => {
    expect(roleDeleteTooltip({
      dirty: false,
      usersCount: 1,
      deleteBlocked
    })).toBe(deleteBlocked)
  })

  it('is empty when the last user has been moved or the draft is dirty', () => {
    expect(roleDeleteTooltip({
      dirty: false,
      usersCount: 0,
      deleteBlocked
    })).toBe('')
    expect(roleDeleteTooltip({
      dirty: true,
      usersCount: 1,
      deleteBlocked
    })).toBe('')
  })
})
