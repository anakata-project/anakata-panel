import type {
  Itinerary,
  ItineraryCompleteness,
  ItineraryDefaults,
  ItineraryPair,
  ItineraryStatus
} from '../../types/api'

export type SavePublishPlan = 'create-then-publish' | 'publish-only'

export type CompletenessBar = {
  barColor: string
  labelColor: string
  label: string
}

export type ItineraryDraft = {
  id: number | null
  code: string
  name: string
  status: ItineraryStatus
  sort_order: number
  festive: boolean
  days: number
  nights: number
  embark: string
  disembark: string
  tagline: string
  hero_image_url: string | null
  hero_alt: string
  fallback_gradient: string
  fallback_gradient_key: string
  card_description: string
  overview: string
  long_description: string
  highlights: Array<string>
  chips: Array<string>
  facts: Array<ItineraryPair>
  day_plan: Array<ItineraryPair>
  included: Array<string>
  excluded: Array<string>
  faqs: Array<ItineraryPair>
  slug: string
  meta_title: string
  meta_description: string
  departures_count: number
  live_departures_count: number
  completeness: ItineraryCompleteness
}

export function savePublishPlan(id: number | null): SavePublishPlan {
  return id === null ? 'create-then-publish' : 'publish-only'
}

export function adoptCreated(draft: ItineraryDraft, created: Itinerary): ItineraryDraft {
  return {
    ...draft,
    id: created.id,
    code: created.code,
    status: created.status,
    departures_count: created.departures_count,
    live_departures_count: created.live_departures_count,
    completeness: created.completeness,
    hero_image_url: created.hero_image_url,
    fallback_gradient: created.fallback_gradient,
    fallback_gradient_key: created.fallback_gradient_key
  }
}

export function completenessBar(completeness: ItineraryCompleteness): CompletenessBar {
  const barColor = completeness.pct === 100
    ? 'var(--ok)'
    : completeness.blocking.length > 0
      ? 'var(--coral)'
      : 'var(--sand)'

  const labelColor = completeness.missing.length > 0 ? 'var(--coral-400)' : 'var(--ok)'
  const missing = completeness.missing.length > 0
    ? ` · MISSING: ${completeness.missing.join(', ').toUpperCase()}`
    : ''

  return {
    barColor,
    labelColor,
    label: `${completeness.pct}% COMPLETE${missing}`
  }
}

export function statusPillClass(status: ItineraryStatus): string {
  if (status === 'PUBLISHED') {
    return 'p-conf'
  }

  if (status === 'DRAFT') {
    return 'p-pend'
  }

  return 'p-wait'
}

export function addDayPlanRow(plan: Array<ItineraryPair>): Array<ItineraryPair> {
  return [...plan, [`Day ${plan.length + 1}`, '']]
}

export function addFaqRow(faqs: Array<ItineraryPair>): Array<ItineraryPair> {
  return [...faqs, ['', '']]
}

export function removePairRow(rows: Array<ItineraryPair>, index: number): Array<ItineraryPair> {
  return rows.filter((_, rowIndex) => rowIndex !== index)
}

export function filledPairs(rows: Array<ItineraryPair>): Array<ItineraryPair> {
  return rows.filter(([left, right]) => left.trim() !== '' || right.trim() !== '')
}

export function draftFromItinerary(itinerary: Itinerary): ItineraryDraft {
  return {
    id: itinerary.id,
    code: itinerary.code,
    name: itinerary.name,
    status: itinerary.status,
    sort_order: itinerary.sort_order,
    festive: itinerary.festive,
    days: itinerary.days,
    nights: itinerary.nights,
    embark: itinerary.embark,
    disembark: itinerary.disembark,
    tagline: itinerary.tagline,
    hero_image_url: itinerary.hero_image_url,
    hero_alt: itinerary.hero_alt,
    fallback_gradient: itinerary.fallback_gradient,
    fallback_gradient_key: itinerary.fallback_gradient_key,
    card_description: itinerary.card_description,
    overview: itinerary.overview,
    long_description: itinerary.long_description,
    highlights: itinerary.highlights,
    chips: itinerary.chips,
    facts: itinerary.facts.map(pair => [pair[0], pair[1]]),
    day_plan: itinerary.day_plan.map(pair => [pair[0], pair[1]]),
    included: itinerary.included,
    excluded: itinerary.excluded,
    faqs: itinerary.faqs.map(pair => [pair[0], pair[1]]),
    slug: itinerary.slug ?? '',
    meta_title: itinerary.meta_title,
    meta_description: itinerary.meta_description,
    departures_count: itinerary.departures_count,
    live_departures_count: itinerary.live_departures_count,
    completeness: itinerary.completeness
  }
}

export function draftFromDefaults(defaults: ItineraryDefaults): ItineraryDraft {
  return {
    id: null,
    code: '',
    name: '',
    status: defaults.status,
    sort_order: defaults.sort_order,
    festive: defaults.festive,
    days: defaults.days,
    nights: defaults.nights,
    embark: defaults.embark,
    disembark: defaults.disembark,
    tagline: defaults.tagline,
    hero_image_url: null,
    hero_alt: defaults.hero_alt,
    fallback_gradient: defaults.fallback_gradient,
    fallback_gradient_key: defaults.fallback_gradient_key,
    card_description: defaults.card_description,
    overview: defaults.overview,
    long_description: defaults.long_description,
    highlights: defaults.highlights,
    chips: defaults.chips,
    facts: defaults.facts.map(pair => [pair[0], pair[1]]),
    day_plan: defaults.day_plan.map(pair => [pair[0], pair[1]]),
    included: defaults.included,
    excluded: defaults.excluded,
    faqs: defaults.faqs.map(pair => [pair[0], pair[1]]),
    slug: defaults.slug ?? '',
    meta_title: defaults.meta_title,
    meta_description: defaults.meta_description,
    departures_count: 0,
    live_departures_count: 0,
    completeness: {
      pct: 0,
      missing: [],
      blocking: []
    }
  }
}

export function itineraryContentBody(draft: ItineraryDraft): Record<string, unknown> {
  return {
    name: draft.name,
    sort_order: draft.sort_order,
    festive: draft.festive,
    days: draft.days,
    nights: draft.nights,
    embark: draft.embark,
    disembark: draft.disembark,
    tagline: draft.tagline,
    hero_alt: draft.hero_alt,
    fallback_gradient: draft.fallback_gradient_key,
    card_description: draft.card_description,
    overview: draft.overview,
    long_description: draft.long_description,
    highlights: draft.highlights,
    chips: draft.chips,
    facts: draft.facts,
    day_plan: filledPairs(draft.day_plan),
    included: draft.included,
    excluded: draft.excluded,
    faqs: filledPairs(draft.faqs),
    slug: draft.slug.trim() === '' ? null : draft.slug.trim(),
    meta_title: draft.meta_title,
    meta_description: draft.meta_description
  }
}

export function editorSnapshot(draft: ItineraryDraft): string {
  return JSON.stringify({
    id: draft.id,
    code: draft.code,
    status: draft.status,
    ...itineraryContentBody(draft)
  })
}
