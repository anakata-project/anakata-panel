export function parseRinValue(raw: string): number | null {
  const trimmed = raw.trim()

  if (trimmed === '') {
    return null
  }

  const value = Number(trimmed)

  return Number.isFinite(value) ? value : null
}
