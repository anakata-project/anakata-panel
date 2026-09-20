const TICK_MS = 60 * 1000

export function useSlaNow() {
  const now = useState('sla-now', () => new Date())
  const ticking = useState('sla-now-ticking', () => false)

  function start(): void {
    if (!import.meta.client || ticking.value) {
      return
    }

    ticking.value = true
    now.value = new Date()
    const timer = window.setInterval(() => {
      now.value = new Date()
    }, TICK_MS)

    onUnmounted(() => {
      window.clearInterval(timer)
      ticking.value = false
    })
  }

  return { now, start }
}
