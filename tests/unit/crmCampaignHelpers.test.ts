import { describe, expect, it } from 'vitest'
import { deliveryStatusClass, formatMeasure } from '../../app/components/crm/campaignHelpers'

describe('deliveryStatusClass', () => {
  it('marks failed and blocked deliveries', () => {
    expect(deliveryStatusClass('FAILED')).toBe('bad')
    expect(deliveryStatusClass('BLOCKED')).toBe('bad')
    expect(deliveryStatusClass('SENT')).toBe('ok')
    expect(deliveryStatusClass('QUEUED')).toBe('')
  })
})

describe('formatMeasure', () => {
  it('renders null as an em dash and leaves numbers as the API sent them', () => {
    expect(formatMeasure(null)).toBe('—')
    expect(formatMeasure(0)).toBe('0')
    expect(formatMeasure(12)).toBe('12')
  })
})
