export const BOOKING_VIEW_IDS = ['all', 'requests', 'contacts-in'] as const
export type BookingViewId = typeof BOOKING_VIEW_IDS[number]

export const DEAL_VIEW_IDS = ['table', 'board'] as const
export type DealViewId = typeof DEAL_VIEW_IDS[number]

export function viewFromQuery<T extends string>(
  raw: unknown,
  allowed: ReadonlyArray<T>,
  fallback: T
): T {
  const value = Array.isArray(raw) ? raw[0] : raw

  if (typeof value === 'string' && (allowed as ReadonlyArray<string>).includes(value)) {
    return value as T
  }

  return fallback
}

export function bookingWindowParams(from: string | null, to: string | null): URLSearchParams {
  const params = new URLSearchParams()

  if (from !== null) {
    params.set('from', from)
  }

  if (to !== null) {
    params.set('to', to)
  }

  return params
}
