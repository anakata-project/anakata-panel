import { describe, expect, it } from 'vitest'
import {
  ALL_CABIN_CODES,
  applyFullYacht,
  blockToOpen,
  cabinsLabel,
  departureOptionLabel,
  isFullYacht,
  scopeLines,
  toggleCabin
} from '../../app/components/blocks/blockHelpers'

describe('full yacht ↔ nine checkboxes', () => {
  it('ticks all nine when Full yacht is on, and clears them when it is off', () => {
    expect(applyFullYacht(true)).toEqual([...ALL_CABIN_CODES])
    expect(isFullYacht(applyFullYacht(true))).toBe(true)
    expect(applyFullYacht(false)).toEqual([])
    expect(isFullYacht([])).toBe(false)
  })

  it('turns Full yacht off when one cabin is unchecked, and on when the last missing cabin is ticked', () => {
    const allButOne = toggleCabin([...ALL_CABIN_CODES], 'S2')

    expect(allButOne).not.toContain('S2')
    expect(isFullYacht(allButOne)).toBe(false)

    const restored = toggleCabin(allButOne, 'S2')

    expect(isFullYacht(restored)).toBe(true)
  })
})

describe('departureOptionLabel', () => {
  it('joins the formatted date and itinerary name', () => {
    expect(departureOptionLabel('7 Nov 2027', 'Western Realm')).toBe('7 Nov 2027 · Western Realm')
  })
})

describe('blockToOpen', () => {
  const blocks = [
    { reference: 'BLK-001' },
    { reference: 'BLK-002' }
  ]

  it('returns null when the query is missing, empty, or unknown', () => {
    expect(blockToOpen(undefined, blocks)).toBeNull()
    expect(blockToOpen(null, blocks)).toBeNull()
    expect(blockToOpen('', blocks)).toBeNull()
    expect(blockToOpen('BLK-999', blocks)).toBeNull()
  })

  it('matches a string or the first array value', () => {
    expect(blockToOpen('BLK-001', blocks)?.reference).toBe('BLK-001')
    expect(blockToOpen(['BLK-002', 'BLK-001'], blocks)?.reference).toBe('BLK-002')
  })
})

describe('scopeLines', () => {
  it('groups claims per departure and labels full yacht', () => {
    const claims = ALL_CABIN_CODES.map((code, index) => ({
      cabin: { code, label: code, id: index + 1 },
      departure: {
        id: 3,
        reference: 'DEP-003',
        date: '2027-11-14',
        yacht: { id: 1, code: 'ANAMARA', name: 'ANAMARA' }
      }
    }))

    expect(scopeLines(claims, iso => iso)).toEqual([
      '2027-11-14 · ANAMARA · Full yacht'
    ])
  })

  it('uses suite ranges', () => {
    expect(cabinsLabel(['S7', 'S8'])).toBe('Suite 07–08')
  })
})
