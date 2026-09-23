import { describe, expect, it } from 'vitest'
import {
  confirmSentence,
  disabledCatalogueSwitches,
  kindPillClass,
  severalBranches,
  stepsByBranch,
  templateByKey
} from '../../app/components/crm/journeyHelpers'

describe('stepsByBranch', () => {
  it('keeps payload order inside each branch and the order branches first appear', () => {
    const groups = stepsByBranch([
      { branch: 'lead', name: 'Day 0' },
      { branch: 'abandoned_checkout', name: 'Cart 1' },
      { branch: 'lead', name: 'Day 2' },
      { branch: 'abandoned_checkout', name: 'Cart 2' }
    ])

    expect(groups.map(group => group.branch)).toEqual(['lead', 'abandoned_checkout'])
    expect(groups[0]?.steps.map(step => step.name)).toEqual(['Day 0', 'Day 2'])
    expect(groups[1]?.steps.map(step => step.name)).toEqual(['Cart 1', 'Cart 2'])
    expect(severalBranches(groups.flatMap(group => group.steps))).toBe(true)
    expect(severalBranches([{ branch: 'lead' }])).toBe(false)
  })
})

describe('confirmSentence', () => {
  it('uses the contract when the API sent one', () => {
    expect(confirmSentence({
      contract: 'The confirmed booking.',
      trigger: 'rms: booking.status CONFIRMED'
    })).toBe('The confirmed booking.')
  })

  it('uses the trigger line when the contract is absent', () => {
    expect(confirmSentence({ contract: null, trigger: 'engine: lead.captured' })).toBe('engine: lead.captured')
    expect(confirmSentence({ contract: '', trigger: 'engine: lead.captured' })).toBe('engine: lead.captured')
  })
})

describe('disabledCatalogueSwitches', () => {
  const rows = [
    { key: 'pretrip', name: 'Pre-trip', enabled: true, disabled_reason: null },
    { key: 'questionnaire', name: 'Questionnaire', enabled: false, disabled_reason: 'Paused for copy' },
    { key: 'data_chaser', name: 'Chase', enabled: false, disabled_reason: 'Off' }
  ]

  it('returns every disabled key on a step, including the pre-trip pair', () => {
    expect(disabledCatalogueSwitches(['pretrip', 'questionnaire'], rows).map(row => row.key)).toEqual(['questionnaire'])
  })

  it('returns a one-key step and skips a key the catalogue does not list', () => {
    expect(disabledCatalogueSwitches(['data_chaser'], rows).map(row => row.key)).toEqual(['data_chaser'])
    expect(disabledCatalogueSwitches(['missing'], rows)).toEqual([])
    expect(disabledCatalogueSwitches([], rows)).toEqual([])
  })

  it('does not repeat a key that appears twice', () => {
    expect(disabledCatalogueSwitches(['questionnaire', 'questionnaire'], rows)).toHaveLength(1)
  })
})

describe('templateByKey', () => {
  it('finds a template by key and returns null when the list has none', () => {
    expect(templateByKey('welcome_web_lead', [{ key: 'welcome_web_lead' }])?.key).toBe('welcome_web_lead')
    expect(templateByKey('pretrip', [{ key: 'welcome_web_lead' }])).toBeNull()
  })
})

describe('kindPillClass', () => {
  it('marks marketing and transactional apart', () => {
    expect(kindPillClass('MARKETING')).toBe('hi')
    expect(kindPillClass('TRANSACTIONAL')).toBe('ok')
  })
})
