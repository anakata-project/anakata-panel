import type { CalendarGrid } from '../types/api'
import {
  groupColumnsByDate,
  yachtSections
} from '../components/calendar/calendarHelpers'

export function useCalendarGrid(
  from: Ref<string | null>,
  to: Ref<string | null>
) {
  const { useFetch } = useApi()

  const calendarUrl = computed(() => {
    const params = new URLSearchParams()

    if (from.value !== null) {
      params.set('from', from.value)
    }

    if (to.value !== null) {
      params.set('to', to.value)
    }

    const query = params.toString()

    return query === '' ? '/api/rms/calendar' : `/api/rms/calendar?${query}`
  })

  const { data: grid, refresh } = useFetch<CalendarGrid>(calendarUrl)

  const departures = computed(() => grid.value?.departures ?? [])
  const columns = computed(() => groupColumnsByDate(departures.value))
  const sections = computed(() => yachtSections(grid.value?.rows ?? []))
  const total = computed(() => departures.value.length)

  return { grid, refresh, departures, columns, sections, total }
}
