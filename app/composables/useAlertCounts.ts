import type { AlertCounts, AlertKindRow, Permission } from '../types/api'
import { alertBadgeClass, seesAnyAlert } from '../components/alerts/alertHelpers'

const POLL_MS = 60 * 1000

const emptyCounts: AlertCounts = {
  INFO: 0,
  WARN: 0,
  CRITICAL: 0
}

type KindsPayload = {
  data: Array<AlertKindRow>
}

type CountsPayload = {
  meta: {
    counts: AlertCounts
  }
}

export function useAlertCounts() {
  const { can, user } = useAuth()
  const { request } = useApi()
  const route = useRoute()

  const counts = useState<AlertCounts>('alert-counts', () => ({ ...emptyCounts }))
  const visible = useState('alert-bell-visible', () => false)
  const polling = useState('alert-bell-polling', () => false)

  const total = computed(() => counts.value.INFO + counts.value.WARN + counts.value.CRITICAL)
  const tone = computed(() => alertBadgeClass(counts.value))

  async function refresh(): Promise<void> {
    if (user.value === null) {
      visible.value = false
      counts.value = { ...emptyCounts }
      return
    }

    try {
      const [kindsBody, listBody] = await Promise.all([
        request('/api/alerts/kinds') as Promise<KindsPayload>,
        request('/api/alerts') as Promise<CountsPayload>
      ])

      visible.value = seesAnyAlert(
        kindsBody.data,
        permission => can(permission as Permission)
      )
      counts.value = listBody.meta.counts
    } catch {
      if (user.value === null) {
        visible.value = false
        counts.value = { ...emptyCounts }
      }
    }
  }

  function startPolling(): void {
    if (!import.meta.client || polling.value) {
      return
    }

    polling.value = true
    void refresh()

    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }, POLL_MS)

    const onVisibility = (): void => {
      if (document.visibilityState === 'visible') {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisibility)

    const stopRoute = watch(() => route.fullPath, () => {
      void refresh()
    })

    const stopUser = watch(() => user.value?.id ?? null, () => {
      void refresh()
    })

    onUnmounted(() => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
      stopRoute()
      stopUser()
      polling.value = false
    })
  }

  return {
    counts,
    total,
    tone,
    visible,
    refresh,
    startPolling
  }
}
