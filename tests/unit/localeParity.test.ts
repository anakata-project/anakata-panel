import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

function leafKeys(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return [prefix]
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const path = prefix === '' ? key : `${prefix}.${key}`
    return leafKeys(child, path)
  })
}

function tokens(value: string): string {
  return [...value.matchAll(/\{[a-zA-Z0-9_]+\}/g)].map(match => match[0]).sort().join(',')
}

function walkTokens(english: unknown, spanish: unknown, path = ''): string[] {
  if (english === null || typeof english !== 'object' || Array.isArray(english)) {
    return tokens(String(english)) === tokens(String(spanish)) ? [] : [path]
  }

  return Object.entries(english as Record<string, unknown>).flatMap(([key, child]) => {
    const next = path === '' ? key : `${path}.${key}`
    const other = (spanish as Record<string, unknown> | undefined)?.[key]
    return walkTokens(child, other, next)
  })
}

const english = JSON.parse(readFileSync(new URL('../../i18n/locales/en.json', import.meta.url), 'utf8')) as Record<string, unknown>
const spanish = JSON.parse(readFileSync(new URL('../../i18n/locales/es.json', import.meta.url), 'utf8')) as Record<string, unknown>

describe('locale key parity', () => {
  it('matches every key in both directions', () => {
    const englishKeys = leafKeys(english).sort()
    const spanishKeys = leafKeys(spanish).sort()

    expect(spanishKeys).toEqual(englishKeys)
  })

  it('keeps interpolation tokens on each key', () => {
    expect(walkTokens(english, spanish)).toEqual([])
  })
})
