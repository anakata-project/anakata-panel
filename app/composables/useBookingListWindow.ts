import { bookingWindowParams } from '../components/bookings/bookingViews'

export function useBookingListWindow() {
  const { format } = useDates()
  const from = useState<string | null>('bookings:window-from', () => null)
  const to = useState<string | null>('bookings:window-to', () => null)
  const total = useState('bookings:window-total', () => 0)
  const revision = useState('bookings:window-revision', () => 0)
  const businessDayMinutes = useState('bookings:window-day-minutes', () => 0)
  const today = computed(() => format(new Date(), 'iso'))

  function params(): URLSearchParams {
    return bookingWindowParams(from.value, to.value)
  }

  function setTotal(value: number): void {
    total.value = value
  }

  function bump(): void {
    revision.value += 1
  }

  function onWindowChange(apply: () => void): void {
    watch([from, to], apply)
  }

  return {
    from,
    to,
    today,
    total,
    revision,
    businessDayMinutes,
    params,
    setTotal,
    bump,
    onWindowChange
  }
}
