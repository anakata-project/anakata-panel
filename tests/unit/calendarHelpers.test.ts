import { describe, expect, it } from 'vitest'
import {
  cellAt,
  deckCabinName,
  deckCabinOrder,
  departureDateOptions,
  groupColumnsByDate,
  mapCabinCell,
  retainSelectedDate,
  yachtSections
} from '../../app/components/calendar/calendarHelpers'
import type {
  CalendarDeparture,
  CalendarRow,
  ClaimSummary
} from '../../app/types/api'

function claim(partial: Partial<ClaimSummary> = {}): ClaimSummary {
  return {
    kind: 'BLOCK',
    hold_type: null,
    expires_at: null,
    holder: {
      type: 'internal_block',
      id: 1,
      reference: 'BLK-001',
      label: 'BLK-001',
      detail: {
        reason: 'FAM_TRIP',
        reason_label: 'Fam trip'
      }
    },
    ...partial
  }
}

function departure(partial: Partial<CalendarDeparture> & Pick<CalendarDeparture, 'id' | 'date' | 'yacht'>): CalendarDeparture {
  return {
    reference: `DEP-${partial.id}`,
    itinerary: { id: 1, code: 'WEST', name: 'Western Isles' },
    festive: false,
    status: 'ON_SALE',
    ...partial
  }
}

function row(partial: Partial<CalendarRow> & Pick<CalendarRow, 'yacht' | 'cabin'>): CalendarRow {
  return {
    cells: {},
    ...partial
  }
}

describe('mapCabinCell', () => {
  const base = {
    cabinLabel: 'Suite 07',
    dateLabel: '14 Nov 2027',
    yachtName: 'ANAMARA'
  }

  it('maps no sailing to c-none', () => {
    expect(mapCabinCell({ ...base, state: null, claim: null })).toMatchObject({
      cellClass: 'c-none',
      label: '—',
      href: null
    })
  })

  it('maps FREE to an available dot', () => {
    expect(mapCabinCell({ ...base, state: 'FREE', claim: null })).toMatchObject({
      cellClass: 'c-av',
      label: '·',
      deckStatus: 'Available',
      href: null
    })
  })

  it('maps each block reason to its short code and tooltip', () => {
    const fam = mapCabinCell({
      ...base,
      state: 'BLOCKED',
      claim: claim()
    })

    expect(fam).toMatchObject({
      cellClass: 'c-block',
      deckClass: 's-block',
      label: 'FAM',
      deckStatus: 'Blocked · Fam trip',
      title: 'Suite 07 · 14 Nov 2027 · ANAMARA — Blocked: Fam trip (BLK-001)',
      href: '/rms/operations/blocks?open=BLK-001'
    })

    expect(mapCabinCell({
      ...base,
      state: 'BLOCKED',
      claim: claim({
        holder: {
          type: 'internal_block',
          id: 2,
          reference: 'BLK-002',
          label: 'BLK-002',
          detail: { reason: 'MAINTENANCE', reason_label: 'Maintenance' }
        }
      })
    }).label).toBe('MAINT')

    expect(mapCabinCell({
      ...base,
      state: 'BLOCKED',
      claim: claim({
        holder: {
          type: 'internal_block',
          id: 3,
          reference: 'BLK-003',
          label: 'BLK-003',
          detail: { reason: 'NEGOTIATION_HOLD', reason_label: 'Negotiation hold' }
        }
      })
    }).label).toBe('NEG')

    expect(mapCabinCell({
      ...base,
      state: 'BLOCKED',
      claim: claim({
        holder: {
          type: 'internal_block',
          id: 4,
          reference: 'BLK-004',
          label: 'BLK-004',
          detail: { reason: 'COURTESY', reason_label: 'Courtesy' }
        }
      })
    }).label).toBe('COURT')
  })

  it('maps holds, including agency and request styles', () => {
    expect(mapCabinCell({
      ...base,
      state: 'HELD',
      claim: claim({
        kind: 'HOLD',
        hold_type: 'WEB',
        holder: {
          type: 'request',
          id: 9,
          reference: 'ANK-R-2027-0001',
          label: 'ANK-R-2027-0001',
          detail: null
        }
      })
    })).toMatchObject({ cellClass: 'c-hold', label: 'HOLD', deckClass: 's-hold' })

    expect(mapCabinCell({
      ...base,
      state: 'HELD',
      claim: claim({
        kind: 'HOLD',
        hold_type: 'AGENCY',
        holder: {
          type: 'booking',
          id: 8,
          reference: 'ANK-2027-0001',
          label: 'ANK-2027-0001',
          detail: null
        }
      })
    })).toMatchObject({ cellClass: 'c-hold', label: 'AGCY' })

    expect(mapCabinCell({
      ...base,
      state: 'HELD',
      claim: claim({
        kind: 'HOLD',
        hold_type: 'REQUEST',
        holder: {
          type: 'request',
          id: 7,
          reference: 'ANK-R-2027-0002',
          label: 'ANK-R-2027-0002',
          detail: null
        }
      })
    })).toMatchObject({ cellClass: 'c-req', label: 'REQ' })
  })

  it('falls back for SOLD until Sprint 4 booking states', () => {
    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      claim: claim({
        kind: 'BOOKING',
        holder: {
          type: 'booking',
          id: 5,
          reference: 'ANK-2027-0005',
          label: 'ANK-2027-0005',
          detail: null
        }
      })
    })).toMatchObject({ cellClass: 'c-conf', label: 'SOLD' })
  })
})

describe('date columns', () => {
  const anamara = { id: 1, code: 'ANAMARA', name: 'ANAMARA' }
  const anativa = { id: 2, code: 'ANATIVA', name: 'ANATIVA' }

  it('groups departures by date and marks a missing yacht as no cell', () => {
    const columns = groupColumnsByDate([
      departure({ id: 3, date: '2027-11-14', yacht: anamara }),
      departure({ id: 14, date: '2027-12-19', yacht: anamara, festive: true }),
      departure({ id: 13, date: '2027-12-19', yacht: anativa, festive: true })
    ])

    expect(columns.map(column => column.date)).toEqual(['2027-11-14', '2027-12-19'])
    expect(columns[0]?.festive).toBe(false)
    expect(columns[1]?.festive).toBe(true)
    expect(columns[0]?.departuresByYachtId[1]?.id).toBe(3)
    expect(columns[0]?.departuresByYachtId[2]).toBeUndefined()

    const anativaRow = row({
      yacht: anativa,
      cabin: { id: 10, code: 'S1', label: 'Suite 01', category: 'SUITE', sort: 1 },
      cells: {}
    })

    expect(cellAt(anativaRow, columns[0]!)).toBeNull()
    expect(mapCabinCell({
      state: null,
      claim: null,
      cabinLabel: 'Suite 01',
      dateLabel: '14 Nov 2027',
      yachtName: 'ANATIVA'
    }).cellClass).toBe('c-none')
  })

  it('keeps a selected date when it is still in range', () => {
    const options = departureDateOptions([
      departure({ id: 1, date: '2027-11-07', yacht: anamara }),
      departure({ id: 3, date: '2027-11-14', yacht: anamara })
    ])

    expect(options).toEqual([
      { date: '2027-11-07', festive: false },
      { date: '2027-11-14', festive: false }
    ])
    expect(retainSelectedDate('2027-11-14', options.map(option => option.date))).toBe('2027-11-14')
    expect(retainSelectedDate('2027-12-26', options.map(option => option.date))).toBe('2027-11-07')
    expect(retainSelectedDate(null, [])).toBeNull()
  })
})

describe('deck order', () => {
  it('puts the Owner\'s Suite first, then Suite 01-08', () => {
    const yacht = { id: 1, code: 'ANAMARA', name: 'ANAMARA' }
    const rows = [
      row({ yacht, cabin: { id: 1, code: 'S1', label: 'Suite 01', category: 'SUITE', sort: 1 } }),
      row({ yacht, cabin: { id: 8, code: 'S8', label: 'Suite 08', category: 'SUITE', sort: 8 } }),
      row({ yacht, cabin: { id: 9, code: 'OWNER', label: 'Owner\'s Suite', category: 'OWNER', sort: 9 } })
    ]

    expect(deckCabinOrder(rows).map(item => item.cabin.code)).toEqual(['OWNER', 'S1', 'S8'])
    expect(deckCabinName('Owner\'s Suite')).toBe('OWNER\'S SUITE')
    expect(yachtSections(rows)).toHaveLength(1)
  })
})
