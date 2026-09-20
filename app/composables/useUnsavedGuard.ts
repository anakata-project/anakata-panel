import type { MaybeRefOrGetter } from 'vue'

export function confirmUnsaved(message: string): boolean {
  return window.confirm(message)
}

export function useUnsavedGuard(
  dirty: MaybeRefOrGetter<boolean>,
  message: MaybeRefOrGetter<string>
): void {
  function onBeforeUnload(event: BeforeUnloadEvent): void {
    event.preventDefault()
    event.returnValue = ''
  }

  watch(() => toValue(dirty), (isDirty) => {
    if (!import.meta.client) {
      return
    }

    if (isDirty) {
      window.addEventListener('beforeunload', onBeforeUnload)
    } else {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, { immediate: true })

  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  })

  onBeforeRouteLeave(() => {
    if (!toValue(dirty)) {
      return true
    }

    return confirmUnsaved(toValue(message))
  })
}
