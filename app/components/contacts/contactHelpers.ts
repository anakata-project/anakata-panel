/**
 * Presentation width for the nationality bar (prototype renderNat).
 * The API already ranks and counts; this only maps guests → percent.
 */
export function nationalityBarWidth(count: number, max: number): number {
  if (max <= 0) {
    return 0
  }

  return Math.round((count / max) * 100)
}
