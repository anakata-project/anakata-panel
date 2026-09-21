import type { ComputedRef, InjectionKey } from 'vue'
import type { ExtrasCatalogue, ExtrasCatalogueItem } from '../../types/api'
import type { ConfigValueFormat } from '../../utils/formatConfigValue'

export type ExtrasDraft = ExtrasCatalogue

export const EXTRAS_DRAFT_KEY: InjectionKey<ComputedRef<ExtrasDraft | null>> = Symbol('extrasDraft')

const ITEM_FIELDS: Array<{ key: keyof ExtrasCatalogueItem, label: string }> = [
  { key: 'code', label: 'code' },
  { key: 'name', label: 'name' },
  { key: 'unit', label: 'unit' },
  { key: 'price_usd', label: 'price' },
  { key: 'triggers_transfer_voucher', label: 'transfer voucher' },
  { key: 'active', label: 'active' }
]

export function emptyCatalogueItem(): ExtrasCatalogueItem {
  return {
    code: '',
    name: '',
    unit: '',
    price_usd: null,
    triggers_transfer_voucher: false,
    active: true
  }
}

export function publishedCodes(document: ExtrasCatalogue): ReadonlySet<string> {
  return new Set(document.items.map(item => item.code))
}

export function extrasFieldLabels(draft: ExtrasCatalogue): Record<string, string> {
  const labels: Record<string, string> = {
    items: 'Extras catalogue'
  }

  draft.items.forEach((item, index) => {
    const prefix = item.code !== '' ? item.code : `Item ${String(index + 1)}`

    for (const field of ITEM_FIELDS) {
      labels[`items.${String(index)}.${field.key}`] = `${prefix} · ${field.label}`
    }
  })

  return labels
}

export function extrasFormats(draft: ExtrasCatalogue): Record<string, ConfigValueFormat> {
  const formats: Record<string, ConfigValueFormat> = {}

  draft.items.forEach((_item, index) => {
    formats[`items.${String(index)}.price_usd`] = 'money'
    formats[`items.${String(index)}.triggers_transfer_voucher`] = 'boolean'
    formats[`items.${String(index)}.active`] = 'boolean'
  })

  return formats
}
