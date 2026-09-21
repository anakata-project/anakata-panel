import { describe, expect, it } from 'vitest'
import { nationalityBarWidth } from '../../app/components/contacts/contactHelpers'

describe('nationalityBarWidth', () => {
  it('maps the largest count to 100 and half to 50', () => {
    expect(nationalityBarWidth(10, 10)).toBe(100)
    expect(nationalityBarWidth(5, 10)).toBe(50)
  })

  it('rounds the prototype percent and treats a zero max as no bar', () => {
    expect(nationalityBarWidth(1, 3)).toBe(33)
    expect(nationalityBarWidth(0, 10)).toBe(0)
    expect(nationalityBarWidth(3, 0)).toBe(0)
  })
})
