import type { Booking } from '../../types/api'
import type { ApiRequestOptions } from '#imports'

type RequestFn = (url: string, options?: ApiRequestOptions) => Promise<unknown>

export async function confirmRequest(request: RequestFn, bookingId: number): Promise<Booking> {
  return await request(`/api/rms/requests/${bookingId}/confirm`, {
    method: 'POST'
  }) as Booking
}

export async function releaseRequest(
  request: RequestFn,
  bookingId: number,
  reason: string
): Promise<Booking> {
  return await request(`/api/rms/requests/${bookingId}/release`, {
    method: 'POST',
    body: { reason }
  }) as Booking
}
