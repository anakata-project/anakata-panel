import type { ApiError } from '#anakata-ui/app/composables/useApi'

declare module '#app' {
  interface RuntimeNuxtHooks {
    'anakata:api-error': (error: ApiError) => void
  }
}

export {}
