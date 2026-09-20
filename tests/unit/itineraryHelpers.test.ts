import { describe, expect, it } from 'vitest'
import type { Itinerary, ItineraryCompleteness, ItineraryDefaults } from '../../app/types/api'
import {
  addDayPlanRow,
  addFaqRow,
  adoptCreated,
  completenessBar,
  draftFromDefaults,
  removePairRow,
  savePublishPlan,
  statusPillClass
} from '../../app/components/itineraries/itineraryHelpers'

const emptyCompleteness: ItineraryCompleteness = {
  pct: 0,
  missing: [],
  blocking: []
}

function sampleCreated(id: number): Itinerary {
  return {
    id,
    code: 'SOUTH',
    name: 'Southern Isles',
    status: 'DRAFT',
    sort_order: 9,
    festive: false,
    days: 8,
    nights: 7,
    embark: 'San Cristóbal (SCY)',
    disembark: 'San Cristóbal (SCY)',
    tagline: '8 days · 7 nights',
    hero_image_url: null,
    hero_alt: '',
    fallback_gradient: 'linear-gradient(135deg,#1B2832 0%,#2A3A42 45%,#33413F 100%)',
    fallback_gradient_key: 'Western (slate)',
    card_description: '',
    overview: '',
    long_description: '',
    highlights: [],
    chips: [],
    facts: [],
    day_plan: [],
    included: [],
    excluded: [],
    faqs: [],
    slug: null,
    meta_title: '',
    meta_description: '',
    completeness: emptyCompleteness,
    departures_count: 0,
    live_departures_count: 0
  }
}

describe('completenessBar', () => {
  it('uses ok at 100%', () => {
    expect(completenessBar({ pct: 100, missing: [], blocking: [] })).toEqual({
      barColor: 'var(--ok)',
      labelColor: 'var(--ok)',
      label: '100% COMPLETE'
    })
  })

  it('uses coral when a blocking item is missing', () => {
    expect(completenessBar({
      pct: 69,
      missing: ['name', 'hero photo'],
      blocking: ['name']
    })).toEqual({
      barColor: 'var(--coral)',
      labelColor: 'var(--coral-400)',
      label: '69% COMPLETE · MISSING: NAME, HERO PHOTO'
    })
  })

  it('uses sand when only non-blocking items are missing', () => {
    expect(completenessBar({
      pct: 77,
      missing: ['hero photo', 'SEO title'],
      blocking: []
    })).toEqual({
      barColor: 'var(--sand)',
      labelColor: 'var(--coral-400)',
      label: '77% COMPLETE · MISSING: HERO PHOTO, SEO TITLE'
    })
  })
})

describe('day-plan and FAQ rows', () => {
  it('adds Day N and removes by index', () => {
    const withFirst = addDayPlanRow([])
    expect(withFirst).toEqual([['Day 1', '']])

    const withSecond = addDayPlanRow(withFirst)
    expect(withSecond).toEqual([['Day 1', ''], ['Day 2', '']])

    expect(removePairRow(withSecond, 0)).toEqual([['Day 2', '']])
  })

  it('adds and removes FAQ rows', () => {
    const withFaq = addFaqRow([])
    expect(withFaq).toEqual([['', '']])
    expect(removePairRow(withFaq, 0)).toEqual([])
  })
})

describe('save & publish state', () => {
  it('plans create-then-publish while new, then publish-only after adoptCreated', () => {
    const defaults: ItineraryDefaults = {
      status: 'DRAFT',
      sort_order: 9,
      festive: false,
      days: 8,
      nights: 7,
      embark: 'San Cristóbal (SCY)',
      disembark: 'San Cristóbal (SCY)',
      tagline: '8 days · 7 nights',
      hero_alt: '',
      fallback_gradient: 'linear-gradient(135deg,#1B2832 0%,#2A3A42 45%,#33413F 100%)',
      fallback_gradient_key: 'Western (slate)',
      gradients: [{
        key: 'Western (slate)',
        css: 'linear-gradient(135deg,#1B2832 0%,#2A3A42 45%,#33413F 100%)'
      }],
      card_description: '',
      overview: '',
      long_description: '',
      highlights: [],
      chips: [],
      facts: [],
      day_plan: [],
      included: [],
      excluded: [],
      faqs: [],
      slug: null,
      meta_title: '',
      meta_description: ''
    }

    const draft = draftFromDefaults(defaults)
    expect(draft.id).toBeNull()
    expect(savePublishPlan(draft.id)).toBe('create-then-publish')

    const existing = adoptCreated(draft, sampleCreated(42))
    expect(existing.id).toBe(42)
    expect(existing.code).toBe('SOUTH')
    expect(savePublishPlan(existing.id)).toBe('publish-only')
  })
})

describe('statusPillClass', () => {
  it('maps prototype pill tones', () => {
    expect(statusPillClass('PUBLISHED')).toBe('p-conf')
    expect(statusPillClass('DRAFT')).toBe('p-pend')
    expect(statusPillClass('HIDDEN')).toBe('p-wait')
  })
})
