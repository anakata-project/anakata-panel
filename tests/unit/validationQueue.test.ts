import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createValidationQueue } from '../../app/utils/validationQueue'

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })

  return { promise, resolve }
}

describe('createValidationQueue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces and sends only the last payload', async () => {
    const request = vi.fn(async (payload: number) => payload)
    const apply = vi.fn()
    const queue = createValidationQueue(request, apply, { delayMs: 400 })

    queue.schedule(1)
    queue.schedule(2)
    queue.schedule(3)

    expect(request).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(400)

    expect(request).toHaveBeenCalledTimes(1)
    expect(request).toHaveBeenCalledWith(3)
    expect(apply).toHaveBeenCalledWith(3)
  })

  it('ignores a stale response', async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    let calls = 0
    const request = vi.fn(() => {
      calls += 1
      return calls === 1 ? first.promise : second.promise
    })
    const apply = vi.fn()
    const queue = createValidationQueue(request, apply, { delayMs: 400 })

    queue.schedule('a')
    await vi.advanceTimersByTimeAsync(400)

    queue.schedule('b')
    await vi.advanceTimersByTimeAsync(400)

    first.resolve('stale')
    await first.promise
    expect(apply).not.toHaveBeenCalled()

    second.resolve('fresh')
    await second.promise
    expect(apply).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith('fresh')
  })

  it('drops a late resolve after invalidate', async () => {
    const pending = deferred<string>()
    const request = vi.fn(() => pending.promise)
    const apply = vi.fn()
    const queue = createValidationQueue(request, apply, { delayMs: 400 })

    queue.schedule('draft')
    await vi.advanceTimersByTimeAsync(400)
    expect(queue.pending()).toBe(true)

    queue.invalidate()
    expect(queue.pending()).toBe(true)

    pending.resolve('late')
    await pending.promise
    await Promise.resolve()

    expect(apply).not.toHaveBeenCalled()
    expect(queue.pending()).toBe(false)
  })

  it('cancels a pending timer on invalidate', async () => {
    const request = vi.fn(async (payload: string) => payload)
    const apply = vi.fn()
    const queue = createValidationQueue(request, apply, { delayMs: 400 })

    queue.schedule('draft')
    expect(queue.pending()).toBe(true)

    queue.invalidate()
    expect(queue.pending()).toBe(false)

    await vi.advanceTimersByTimeAsync(400)

    expect(request).not.toHaveBeenCalled()
    expect(apply).not.toHaveBeenCalled()
  })
})
