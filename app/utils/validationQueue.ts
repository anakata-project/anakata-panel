export type ValidationQueue<TPayload> = {
  schedule: (payload: TPayload) => void
  invalidate: () => void
  pending: () => boolean
}

export function createValidationQueue<TPayload, TResult>(
  request: (payload: TPayload) => Promise<TResult>,
  apply: (result: TResult) => void,
  options: {
    delayMs?: number
    onPending?: (pending: boolean) => void
  } = {}
): ValidationQueue<TPayload> {
  const delayMs = options.delayMs ?? 400
  let seq = 0
  let timer: ReturnType<typeof setTimeout> | null = null
  let flying = 0

  function emitPending(): void {
    options.onPending?.(timer !== null || flying > 0)
  }

  function invalidate(): void {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }

    seq += 1
    emitPending()
  }

  function schedule(payload: TPayload): void {
    if (timer !== null) {
      clearTimeout(timer)
    }

    const id = ++seq
    timer = setTimeout(() => {
      timer = null
      flying += 1
      emitPending()

      void request(payload)
        .then((result) => {
          if (id === seq) {
            apply(result)
          }
        })
        .finally(() => {
          flying -= 1
          emitPending()
        })
    }, delayMs)

    emitPending()
  }

  return {
    schedule,
    invalidate,
    pending: () => timer !== null || flying > 0
  }
}
