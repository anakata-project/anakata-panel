import { describe, expect, it } from 'vitest'
import {
  jobOutcomePillClass,
  sideTokens,
  systemBadgeClass
} from '../../app/components/crm/syncHelpers'

describe('systemBadgeClass', () => {
  it('maps each system token', () => {
    expect(systemBadgeClass('RMS')).toBe('sys-rms')
    expect(systemBadgeClass('CRM')).toBe('sys-crm')
    expect(systemBadgeClass('ENGINE')).toBe('sys-eng')
    expect(systemBadgeClass('ENG')).toBe('sys-eng')
    expect(systemBadgeClass('EXTERNAL')).toBe('sys-ext')
    expect(systemBadgeClass('EXT')).toBe('sys-ext')
  })

  it('matches mixed case', () => {
    expect(systemBadgeClass('eng')).toBe('sys-eng')
    expect(systemBadgeClass('Engine')).toBe('sys-eng')
    expect(systemBadgeClass('ENGINE')).toBe('sys-eng')
    expect(systemBadgeClass(' crm ')).toBe('sys-crm')
  })

  it('returns empty for unknown, empty, and compound strings', () => {
    expect(systemBadgeClass('')).toBe('')
    expect(systemBadgeClass('   ')).toBe('')
    expect(systemBadgeClass('UNKNOWN')).toBe('')
    expect(systemBadgeClass('RMS + CRM')).toBe('')
    expect(systemBadgeClass('ENGINE + CRM')).toBe('')
  })
})

describe('sideTokens', () => {
  it('splits a compound side on plus and trims', () => {
    expect(sideTokens('RMS + CRM')).toEqual(['RMS', 'CRM'])
    expect(sideTokens('ENGINE + CRM')).toEqual(['ENGINE', 'CRM'])
    expect(sideTokens('CRM')).toEqual(['CRM'])
    expect(sideTokens('  +  ')).toEqual([])
    expect(sideTokens('')).toEqual([])
  })
})

describe('jobOutcomePillClass', () => {
  it('maps known outcomes and ignores the rest', () => {
    expect(jobOutcomePillClass('failed')).toBe('bad')
    expect(jobOutcomePillClass('succeeded')).toBe('ok')
    expect(jobOutcomePillClass('running')).toBe('mid')
    expect(jobOutcomePillClass(null)).toBe('')
    expect(jobOutcomePillClass(undefined)).toBe('')
    expect(jobOutcomePillClass('unknown')).toBe('')
  })
})
