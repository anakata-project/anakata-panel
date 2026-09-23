import { describe, expect, it } from 'vitest'
import { isScheduledRun, retentionDays } from '../../app/components/commercial/reportHelpers'

describe('report helpers', () => {
  it('reads retention days from the rules document', () => {
    expect(retentionDays({ reports: { retention_days: 90 } })).toBe(90)
    expect(retentionDays({ reports: { retention_days: 14 } })).toBe(14)
  })

  it('does not invent a retention period', () => {
    expect(retentionDays(null)).toBeNull()
    expect(retentionDays({})).toBeNull()
    expect(retentionDays({ reports: { retention_days: 0 } })).toBeNull()
    expect(retentionDays({ reports: { retention_days: '90' } })).toBeNull()
  })

  it('treats a missing requester as a scheduled run', () => {
    expect(isScheduledRun(null)).toBe(true)
    expect(isScheduledRun(4)).toBe(false)
  })
})
