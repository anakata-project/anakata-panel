function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function canonicalise(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(item => canonicalise(item))
  }

  if (!isPlainObject(value)) {
    return value
  }

  const keys = Object.keys(value).sort()
  const out: Record<string, unknown> = {}

  for (const key of keys) {
    out[key] = canonicalise(value[key])
  }

  return out
}

export function documentsEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalise(left)) === JSON.stringify(canonicalise(right))
}

export function cloneDocument<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
