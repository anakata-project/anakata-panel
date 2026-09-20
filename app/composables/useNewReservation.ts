export type NewReservationPrefill = {
  departureId?: number
  cabinCode?: string
}

export function useNewReservation() {
  const open = useState('bookings:new-open', () => false)
  const prefill = useState<NewReservationPrefill | null>('bookings:new-prefill', () => null)

  function openNew(next?: NewReservationPrefill): void {
    prefill.value = next ?? null
    open.value = true
  }

  return { open, prefill, openNew }
}
