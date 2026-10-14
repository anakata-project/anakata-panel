import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

type ReverbEcho = Echo<'reverb'>

declare global {
  interface Window {
    Pusher: typeof Pusher
  }
}

let echo: ReverbEcho | null = null

function xsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)

  return match?.[1] ? decodeURIComponent(match[1]) : null
}

export function useEcho(): ReverbEcho | null {
  if (!import.meta.client) {
    return null
  }

  if (echo) {
    return echo
  }

  const config = useRuntimeConfig()
  const key = String(config.public.reverbAppKey ?? '')

  if (key === '') {
    return null
  }

  window.Pusher = Pusher

  const apiBase = String(config.public.apiBase).replace(/\/$/, '')
  const port = Number(config.public.reverbPort ?? 8001)
  const scheme = String(config.public.reverbScheme ?? 'http')

  echo = new Echo({
    broadcaster: 'reverb',
    key,
    wsHost: String(config.public.reverbHost ?? 'localhost'),
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        void fetch(`${apiBase}/api/broadcasting/auth`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-XSRF-TOKEN': xsrfToken() ?? ''
          },
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name
          })
        }).then(async (response) => {
          if (!response.ok) {
            callback(new Error('Broadcast auth failed'), null)
            return
          }

          callback(null, await response.json() as { auth: string })
        }).catch((error: unknown) => {
          callback(error instanceof Error ? error : new Error('Broadcast auth failed'), null)
        })
      }
    })
  })

  return echo
}
