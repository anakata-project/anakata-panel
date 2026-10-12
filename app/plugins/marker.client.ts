import markerSDK, { type MarkerSdk } from '@marker.io/browser'

const APP = 'panel'

function markerProjectId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function applyReporter(widget: MarkerSdk, email: string, fullName: string, role: string): void {
  widget.setReporter({ email, fullName })
  widget.setCustomData({ app: APP, role })
}

function clearReporter(widget: MarkerSdk): void {
  widget.clearReporter()
  widget.setCustomData({ app: APP })
}

export default defineNuxtPlugin(() => {
  const project = markerProjectId(useRuntimeConfig().public.markerProjectId)

  if (project === '') {
    return
  }

  const { user, ensureMe } = useAuth()
  let widget: MarkerSdk | null = null

  function sync(): void {
    if (widget === null) {
      return
    }

    const me = user.value

    if (me === null) {
      clearReporter(widget)
      return
    }

    applyReporter(widget, me.email, me.name, me.role.slug)
  }

  watch(user, sync)

  void (async () => {
    await ensureMe()
    widget = await markerSDK.loadWidget({
      project,
      customData: { app: APP },
      networkRecording: {
        excludedKeys: ['password'],
        excludedDomains: ['api.stripe.com', 'js.stripe.com', 'm.stripe.com', 'hooks.stripe.com']
      }
    })
    sync()
  })().catch(() => {
    // A Marker outage must not block the app.
  })
})
