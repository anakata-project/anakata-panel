import { describe, expect, it } from 'vitest'
import { formatFlags } from '../../app/components/admin/formatFlags'

describe('formatFlags', () => {
  it('returns an em dash when there are no flags', () => {
    expect(formatFlags([])).toBe('—')
  })

  it('maps finance and director flags to lower-case group labels', () => {
    expect(formatFlags(['refunds.approve'])).toBe('director')
    expect(formatFlags(['refunds.execute'])).toBe('finance')
  })

  it('joins unique groups as director · finance', () => {
    expect(formatFlags([
      'refunds.execute',
      'refunds.approve',
      'payments.mark_wire_received',
      'commissions.override_cap'
    ])).toBe('director · finance')
  })

  it('ignores unknown values', () => {
    expect(formatFlags(['bookings.create'])).toBe('—')
  })
})
