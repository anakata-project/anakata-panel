/**
 * Display formatting for the commercial dashboard.
 * Occupancy stays the API ratio string. Nothing here divides berths or revenue.
 */

function scaledPercent(ratio: string): string | null {
  const parts = ratio.split('.')

  if (parts.length !== 2) {
    return null
  }

  const whole = parts[0] ?? ''
  const fraction = parts[1] ?? ''

  if (!/^\d+$/.test(whole) || !/^\d{4}$/.test(fraction)) {
    return null
  }

  const hundred = `${whole}${fraction.slice(0, 2)}`
  const rest = fraction.slice(2)

  return `${String(Number(hundred))}.${rest}`
}

/** Whole-percent rule as the same 4-decimal ratio the metrics payload uses. */
export function thresholdRatio(thresholdPct: number): string | null {
  if (!Number.isInteger(thresholdPct) || thresholdPct < 0 || thresholdPct > 100) {
    return null
  }

  if (thresholdPct === 100) {
    return '1.0000'
  }

  return `0.${String(thresholdPct).padStart(2, '0')}00`
}

/** Null when the API sent null or a zero ratio, so the page can show an em dash. */
export function ratioPercentLabel(ratio: string | null): string | null {
  if (ratio === null) {
    return null
  }

  const scaled = scaledPercent(ratio)

  if (scaled === null || scaled === '0.00') {
    return null
  }

  return `${scaled}%`
}

export function occupancyBarWidth(ratio: string | null): string {
  if (ratio === null) {
    return '0%'
  }

  const scaled = scaledPercent(ratio)

  if (scaled === null) {
    return '0%'
  }

  return `${scaled}%`
}

export function occupancyIsLow(ratio: string | null, thresholdPct: number | null): boolean {
  if (ratio === null || thresholdPct === null) {
    return false
  }

  const threshold = thresholdRatio(thresholdPct)

  if (threshold === null) {
    return false
  }

  return ratio < threshold
}
