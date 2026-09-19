import { describe, expect, it } from 'vitest'
import { linesToList } from '../../app/utils/linesToList'

describe('linesToList', () => {
  it('trims, drops empty lines and keeps order', () => {
    expect(linesToList('Family\nFriends\nCorporate / Incentive\nCelebration')).toEqual([
      'Family',
      'Friends',
      'Corporate / Incentive',
      'Celebration'
    ])

    expect(linesToList('  Family  \n\n  Friends\n')).toEqual(['Family', 'Friends'])
  })

  it('does not keep a blank line or a trailing space as a list item', () => {
    expect(linesToList('Family\n')).toEqual(['Family'])
    expect(linesToList('Family\n   ')).toEqual(['Family'])
    expect(linesToList('Family \nFriends')).toEqual(['Family', 'Friends'])
    expect(linesToList('')).toEqual([])
  })
})
