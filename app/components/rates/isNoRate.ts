import type { NoRate, Quote } from '../../types/api'

export function isNoRate(value: Quote | NoRate): value is NoRate {
  return 'reason' in value && !('total' in value)
}
