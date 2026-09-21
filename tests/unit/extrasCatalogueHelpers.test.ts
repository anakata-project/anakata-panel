import { describe, expect, it } from 'vitest'
import {
  emptyCatalogueItem,
  extrasFieldLabels,
  publishedCodes
} from '../../app/components/extras/extrasCatalogueHelpers'
import type { ExtrasCatalogue } from '../../app/types/api'

const draft: ExtrasCatalogue = {
  items: [
    {
      code: 'FLT',
      name: 'Domestic flights',
      unit: 'per person',
      price_usd: 420,
      triggers_transfer_voucher: true,
      active: true
    },
    emptyCatalogueItem()
  ]
}

describe('extrasCatalogueHelpers', () => {
  it('labels catalogue fields with the code or a new-item prefix', () => {
    const labels = extrasFieldLabels(draft)

    expect(labels['items.0.price_usd']).toBe('FLT · price')
    expect(labels['items.1.code']).toBe('Item 2 · code')
  })

  it('treats published codes as the current document set', () => {
    expect([...publishedCodes({ items: [draft.items[0] as (typeof draft.items)[0]] })]).toEqual(['FLT'])
  })
})
