import { describe, expect, it } from 'vitest'
import { flattenConfigHistory } from '../../app/utils/configHistory'

describe('flattenConfigHistory', () => {
  it('shows Initial values for version 1 with no changes', () => {
    const rows = flattenConfigHistory([
      {
        version: 1,
        published_at: '2026-09-19T12:00:00Z',
        published_by: null,
        approval_reference: 'SEED',
        changes: []
      }
    ], { system: 'System', initialValues: 'Initial values' })

    expect(rows).toEqual([
      {
        key: '1-initial',
        version: 1,
        publishedAt: '2026-09-19T12:00:00Z',
        who: 'System',
        item: 'Initial values',
        path: '',
        from: null,
        to: null,
        approval: 'SEED'
      }
    ])
  })

  it('emits one row per change and shares who / approval', () => {
    const rows = flattenConfigHistory([
      {
        version: 2,
        published_at: '2026-09-19T15:00:00Z',
        published_by: { id: 1, name: 'Carolina' },
        approval_reference: 'BOARD-9',
        changes: [
          { path: 'terms.cabin_deposit_pct', label: 'Cabin deposit %', from: 10, to: 15 },
          { path: 'rules.single_supplement_pct', label: 'Single supplement', from: 75, to: 80 }
        ]
      }
    ], { system: 'System', initialValues: 'Initial values' })

    expect(rows).toHaveLength(2)
    expect(rows[0]?.who).toBe('Carolina')
    expect(rows[0]?.approval).toBe('BOARD-9')
    expect(rows[1]?.who).toBe('Carolina')
    expect(rows[1]?.item).toBe('Single supplement')
  })
})
