export type ConfigValueFormat = 'money' | 'pct' | 'list' | 'bands' | 'boolean' | 'plain'

export type CancellationBandValue = {
  min_days: number
  penalty_pct: number
}

export function formatUsd(usd: number): string {
  if (!Number.isInteger(usd)) {
    throw new TypeError('usd must be an integer')
  }

  return `USD ${usd.toLocaleString('en-US')}`
}

function lookupFormat(
  path: string,
  formats?: Record<string, ConfigValueFormat>
): ConfigValueFormat | undefined {
  if (!formats) {
    return undefined
  }

  if (formats[path]) {
    return formats[path]
  }

  let best: { key: string, format: ConfigValueFormat } | undefined

  for (const [key, format] of Object.entries(formats)) {
    if (path === key || path.startsWith(`${key}.`)) {
      if (!best || key.length > best.key.length) {
        best = { key, format }
      }
    }
  }

  return best?.format
}

function isBandList(value: unknown): value is Array<CancellationBandValue> {
  return Array.isArray(value)
    && value.length > 0
    && value.every((item) => {
      return typeof item === 'object'
        && item !== null
        && 'min_days' in item
        && 'penalty_pct' in item
    })
}

export function formatBands(bands: Array<CancellationBandValue>): string {
  const sorted = [...bands].sort((a, b) => b.min_days - a.min_days)

  return sorted.map((band, index) => {
    if (index === 0) {
      return `≥${band.min_days} d ${band.penalty_pct}%`
    }

    const previous = sorted[index - 1]

    return `${band.min_days}–${(previous?.min_days ?? 0) - 1} d ${band.penalty_pct}%`
  }).join(' · ')
}

function inferFormat(path: string, value: unknown): ConfigValueFormat | undefined {
  if (path.endsWith('_pct') || path.includes('_pct.')) {
    return 'pct'
  }

  if (typeof value === 'boolean') {
    return 'boolean'
  }

  if (isBandList(value)) {
    return 'bands'
  }

  if (Array.isArray(value)) {
    return 'list'
  }

  return undefined
}

function formatList(value: Array<unknown>): string {
  return value.map((item) => {
    if (item === null || item === undefined) {
      return '—'
    }

    if (typeof item === 'object') {
      return JSON.stringify(item)
    }

    return String(item)
  }).join(' · ')
}

export function formatConfigValue(
  path: string,
  value: unknown,
  formats?: Record<string, ConfigValueFormat>
): string {
  if (value === null || value === undefined) {
    return '—'
  }

  const format = lookupFormat(path, formats) ?? inferFormat(path, value)

  if (format === 'money' && typeof value === 'number') {
    return formatUsd(value)
  }

  if (format === 'pct' && typeof value === 'number') {
    return `${value}%`
  }

  if (format === 'boolean' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (format === 'bands' && isBandList(value)) {
    return formatBands(value)
  }

  if (format === 'list' && Array.isArray(value)) {
    return formatList(value)
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (Array.isArray(value)) {
    return formatList(value)
  }

  if (typeof value === 'object') {
    return JSON.stringify(value)
  }

  return String(value)
}
