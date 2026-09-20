import { describe, expect, it } from 'vitest'
import {
  bookingOwnerId,
  bookingTooltip,
  canActOnBooking,
  cellAt,
  deckCabinName,
  deckCabinOrder,
  departureDateOptions,
  freeCellPrompt,
  groupColumnsByDate,
  mapCabinCell,
  retainSelectedDate,
  yachtSections
} from '../../app/components/calendar/calendarHelpers'
import type {
  BookingSegment,
  BookingStatus,
  BookingType,
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

function bookingDetail(partial: {
  status?: BookingStatus
  type?: BookingType
  segment?: BookingSegment
  display_reference?: string | null
  owner_id?: number
  owner_name?: string
  party_label?: string
  hold_expired?: boolean
} = {}): NonNullable<ClaimSummary['holder']['detail']> {
  return {
    status: partial.status ?? 'CONFIRMED',
    type: partial.type ?? 'CABIN',
    segment: partial.segment ?? 'D2C',
    display_reference: partial.display_reference === undefined ? 'ANK-2026-0005' : partial.display_reference,
    owner_id: partial.owner_id ?? 3,
    owner_name: partial.owner_name ?? 'Lucía',
    party_label: partial.party_label ?? '2 AD',
    hold_expired: partial.hold_expired ?? false
  }
}

function bookingClaim(partial: {
  id?: number
  kind?: ClaimSummary['kind']
  hold_type?: ClaimSummary['hold_type']
  reference?: string
  detail?: ClaimSummary['holder']['detail']
} = {}): ClaimSummary {
  const reference = partial.reference ?? 'ANK-2026-0005'

  return claim({
    kind: partial.kind ?? 'BOOKING',
    hold_type: partial.hold_type ?? null,
    holder: {
      type: 'booking',
      id: partial.id ?? 5,
      reference,
      label: reference,
      detail: partial.detail === undefined ? bookingDetail({ display_reference: reference }) : partial.detail
    }
  })
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
      claim: claim(),
      canAct: false
    })

    expect(fam).toMatchObject({
      cellClass: 'c-block',
      deckClass: 's-block',
      label: 'FAM',
      deckStatus: 'Blocked · Fam trip',
      title: 'Suite 07 · 14 Nov 2027 · ANAMARA — Blocked: Fam trip (BLK-001)',
      href: '/rms/operations/blocks?open=BLK-001',
      locked: false
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

  it('maps a live request hold to REQ and a booking id action', () => {
    const view = mapCabinCell({
      ...base,
      cabinLabel: 'Suite 04',
      dateLabel: '21 Nov 2027',
      state: 'HELD',
      canAct: true,
      claim: bookingClaim({
        id: 41,
        kind: 'HOLD',
        hold_type: 'REQUEST',
        reference: 'ANK-R-2026-0041',
        detail: bookingDetail({
          status: 'REQUESTED',
          display_reference: 'ANK-R-2026-0041',
          party_label: '2 AD',
          owner_name: 'Lucía'
        })
      })
    })

    expect(view).toMatchObject({
      cellClass: 'c-req',
      deckClass: 's-hold',
      label: 'REQ',
      deckStatus: 'Requested · 2 AD',
      title: 'Suite 04 · 21 Nov 2027 · ANAMARA — ANK-R-2026-0041 · Requested · Lucía',
      locked: false,
      action: { type: 'open', bookingId: 41 }
    })
  })

  it('treats a present claim with hold_expired as a free cell', () => {
    const view = mapCabinCell({
      ...base,
      cabinLabel: 'Suite 04',
      dateLabel: '21 Nov 2027',
      state: 'HELD',
      canCreate: true,
      departureId: 12,
      cabinCode: 'S4',
      claim: bookingClaim({
        id: 41,
        kind: 'HOLD',
        hold_type: 'REQUEST',
        reference: 'ANK-R-2026-0041',
        detail: bookingDetail({
          status: 'REQUESTED',
          display_reference: 'ANK-R-2026-0041',
          hold_expired: true
        })
      })
    })

    expect(view).toMatchObject({
      cellClass: 'c-av',
      label: '·',
      deckStatus: 'Available',
      title: 'Suite 04 · 21 Nov 2027 · ANAMARA — Available (ANK-R-2026-0041 hold expired)',
      locked: false,
      action: { type: 'free', departureId: 12, cabinCode: 'S4' }
    })
  })

  it('maps each Sprint 4 booking state', () => {
    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      claim: bookingClaim({
        reference: 'ANK-2026-0012',
        detail: bookingDetail({
          type: 'CHARTER',
          status: 'CONFIRMED',
          segment: 'CHARTER',
          display_reference: 'ANK-2026-0012',
          party_label: '0 AD'
        })
      })
    })).toMatchObject({
      cellClass: 'c-charter',
      label: 'CHARTER',
      deckStatus: 'Charter · 0 AD',
      action: { type: 'open', bookingId: 5 }
    })

    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      claim: bookingClaim({
        reference: 'ANK-2026-0014',
        detail: bookingDetail({
          status: 'PENDING_PAYMENT',
          display_reference: 'ANK-2026-0014',
          party_label: '2 AD'
        })
      })
    })).toMatchObject({
      cellClass: 'c-dep',
      label: 'PEND',
      deckStatus: 'Pending payment · 2 AD'
    })

    expect(mapCabinCell({
      ...base,
      cabinLabel: 'Suite 04',
      dateLabel: '7 Nov 2027',
      state: 'SOLD',
      claim: bookingClaim({
        reference: 'ANK-2026-0005',
        detail: bookingDetail({
          status: 'CONFIRMED',
          display_reference: 'ANK-2026-0005',
          owner_name: 'Lucía',
          party_label: '2 AD',
          segment: 'D2C'
        })
      })
    })).toMatchObject({
      cellClass: 'c-conf',
      label: '0005',
      deckStatus: 'Confirmed · 2 AD · D2C',
      title: 'Suite 04 · 7 Nov 2027 · ANAMARA — ANK-2026-0005 · Confirmed · Lucía'
    })

    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      claim: bookingClaim({
        reference: 'ANK-2026-0005',
        detail: bookingDetail({
          status: 'FULLY_PAID',
          display_reference: 'ANK-2026-0005',
          party_label: '2 AD',
          segment: 'D2C'
        })
      })
    })).toMatchObject({
      cellClass: 'c-full',
      label: '0005',
      deckStatus: 'Fully paid · 2 AD · D2C'
    })

    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      claim: bookingClaim({
        reference: 'ANK-2026-0021',
        detail: bookingDetail({
          status: 'ON_BOARD',
          display_reference: 'ANK-2026-0021',
          party_label: '2 AD',
          segment: 'D2C'
        })
      })
    })).toMatchObject({
      cellClass: 'c-full',
      label: '0021',
      deckStatus: 'Fully paid · 2 AD · D2C'
    })

    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      claim: bookingClaim({
        reference: 'ANK-2026-0022',
        detail: bookingDetail({
          status: 'COMPLETED',
          display_reference: 'ANK-2026-0022',
          party_label: '2 AD',
          segment: 'D2C'
        })
      })
    })).toMatchObject({
      cellClass: 'c-conf',
      label: '0022',
      deckStatus: 'Completed · 2 AD'
    })
  })

  it('adds the lock class only when canAct is false on a booking or request', () => {
    const locked = mapCabinCell({
      ...base,
      state: 'SOLD',
      canAct: false,
      claim: bookingClaim()
    })

    expect(locked.cellClass).toBe('c-conf lock')
    expect(locked.locked).toBe(true)
    expect(locked.deckStatus.startsWith('🔒 ')).toBe(true)

    expect(mapCabinCell({
      ...base,
      state: 'SOLD',
      canAct: true,
      claim: bookingClaim()
    }).locked).toBe(false)

    expect(mapCabinCell({
      ...base,
      state: 'BLOCKED',
      canAct: false,
      claim: claim()
    }).locked).toBe(false)
  })

  it('offers a free-cell create action when the user can create', () => {
    expect(mapCabinCell({
      ...base,
      cabinLabel: 'Suite 04',
      dateLabel: '7 Nov 2027',
      state: 'FREE',
      claim: null,
      canCreate: true,
      departureId: 3,
      cabinCode: 'S4'
    })).toMatchObject({
      cellClass: 'c-av',
      title: 'Available — Suite 04 on 7 Nov 2027 · ANAMARA. Create a manual reservation here?',
      action: { type: 'free', departureId: 3, cabinCode: 'S4' }
    })
  })
})

describe('canActOnBooking', () => {
  it('matches ChecksOwnRecords: act-on-any or same owner', () => {
    expect(canActOnBooking(8, 3, false)).toBe(false)
    expect(canActOnBooking(3, 3, false)).toBe(true)
    expect(canActOnBooking(8, 3, true)).toBe(true)
    expect(canActOnBooking(8, null, false)).toBe(false)
    expect(canActOnBooking(8, null, true)).toBe(true)
  })

  it('reads owner_id from a booking claim detail', () => {
    expect(bookingOwnerId(bookingClaim({ detail: bookingDetail({ owner_id: 8 }) }))).toBe(8)
    expect(bookingOwnerId(claim())).toBeNull()
  })
})

describe('tooltip and free-cell prompt', () => {
  it('builds the booking tooltip and free-cell prompt', () => {
    expect(bookingTooltip('Suite 04', '7 Nov 2027', 'ANAMARA', 'ANK-2026-0005', 'Confirmed', 'Lucía'))
      .toBe('Suite 04 · 7 Nov 2027 · ANAMARA — ANK-2026-0005 · Confirmed · Lucía')
    expect(freeCellPrompt('Suite 04', '7 Nov 2027', 'ANAMARA'))
      .toBe('Available — Suite 04 on 7 Nov 2027 · ANAMARA. Create a manual reservation here?')
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

    expect(cellAt(anativaRow, columns[0]!, columns)).toBeNull()

    const anamaraRow = row({
      yacht: anamara,
      cabin: { id: 1, code: 'S1', label: 'Suite 01', category: 'SUITE', sort: 1 },
      cells: {
        0: { state: 'SOLD', claim: bookingClaim({ reference: 'ANK-2026-0003' }) },
        1: { state: 'FREE', claim: null }
      }
    })

    expect(cellAt(anamaraRow, columns[0]!, columns)?.state).toBe('SOLD')
    expect(cellAt(anamaraRow, columns[1]!, columns)?.state).toBe('FREE')
    expect(mapCabinCell({
      state: null,
      claim: null,
      cabinLabel: 'Suite 01',
      dateLabel: '14 Nov 2027',
      yachtName: 'ANATIVA'
    }).cellClass).toBe('c-none')
  })

  it('does not treat a list index as a departure id', () => {
    const columns = groupColumnsByDate([
      departure({ id: 1, date: '2027-11-07', yacht: anamara }),
      departure({ id: 3, date: '2027-11-14', yacht: anamara }),
      departure({ id: 5, date: '2027-11-21', yacht: anamara })
    ])
    const anamaraRow = row({
      yacht: anamara,
      cabin: { id: 3, code: 'S3', label: 'Suite 03', category: 'SUITE', sort: 3 },
      cells: {
        0: { state: 'FREE', claim: null },
        1: { state: 'SOLD', claim: bookingClaim({ reference: 'ANK-2026-0007' }) },
        2: { state: 'FREE', claim: null }
      }
    })

    expect(cellAt(anamaraRow, columns[0]!, columns)?.state).toBe('FREE')
    expect(cellAt(anamaraRow, columns[1]!, columns)?.claim?.holder.reference).toBe('ANK-2026-0007')
    expect(cellAt(anamaraRow, columns[2]!, columns)?.state).toBe('FREE')
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
