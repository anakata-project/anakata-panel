import { describe, expect, it } from 'vitest'
import {
  conditionItem,
  dimensionClass,
  emptyCondition,
  groupBySection,
  pinSuppressedLast
} from '../../app/components/crm/audienceHelpers'

describe('pinSuppressedLast', () => {
  it('keeps other keys in order and moves suppression to the end', () => {
    expect(pinSuppressedLast([
      { key: 'warm_dreamers' },
      { key: 'suppressed' },
      { key: 'custom_list' }
    ]).map(row => row.key)).toEqual(['warm_dreamers', 'custom_list', 'suppressed'])
  })
})

describe('dimensionClass', () => {
  it('maps the prototype axes and leaves an unknown axis plain', () => {
    expect(dimensionClass('BEHAVIOUR')).toBe('b')
    expect(dimensionClass('INTEREST')).toBe('i')
    expect(dimensionClass('LOCATION')).toBe('l')
    expect(dimensionClass('PROFILE')).toBe('p')
    expect(dimensionClass('PROMOTION')).toBe('p')
    expect(dimensionClass('OTHER')).toBe('')
  })
})

describe('groupBySection', () => {
  it('keeps sections in the order they arrive', () => {
    const groups = groupBySection([
      { section: 'a', section_label: 'a · Lead', name: 'one' },
      { section: 'a', section_label: 'a · Lead', name: 'two' },
      { section: 'b', section_label: 'b · Request', name: 'three' },
      { section: 'g', section_label: 'g · Internal', name: 'four' }
    ])

    expect(groups.map(group => group.section)).toEqual(['a', 'b', 'g'])
    expect(groups.map(group => group.label)).toEqual(['a · Lead', 'b · Request', 'g · Internal'])
    expect(groups[0]?.rows.map(row => row.name)).toEqual(['one', 'two'])
  })

  it('starts a new group when a section returns later', () => {
    const groups = groupBySection([
      { section: 'a', section_label: 'A', name: 'one' },
      { section: 'b', section_label: 'B', name: 'two' },
      { section: 'a', section_label: 'A', name: 'three' }
    ])

    expect(groups.map(group => group.section)).toEqual(['a', 'b', 'a'])
    expect(groups[2]?.rows.map(row => row.name)).toEqual(['three'])
  })
})

describe('conditionItem', () => {
  it('builds an in-list and an age range from the vocabulary value kind', () => {
    const listed = conditionItem({
      ...emptyCondition({ field: 'counted', operators: ['in'], value: 'integer' }),
      operator: 'in',
      listText: '2, 4'
    }, {
      field: 'counted',
      operators: ['in'],
      value: 'integer'
    })

    const ages = conditionItem({
      ...emptyCondition({ field: 'span', operators: ['between'], value: 'age_range' }),
      operator: 'between',
      ageMin: '6',
      ageMax: '17'
    }, {
      field: 'span',
      operators: ['between'],
      value: 'age_range'
    })

    expect(listed).toEqual({ field: 'counted', operator: 'in', value: [2, 4] })
    expect(ages).toEqual({ field: 'span', operator: 'between', value: [6, 17] })
  })

  it('sends only the params that field lists, and omits an empty window', () => {
    const spec = {
      field: 'counted',
      operators: ['gte'],
      value: 'integer',
      params: [
        { name: 'event', type: 'enum', values: ['view_itinerary'] },
        { name: 'within_days', type: 'integer_or_null' }
      ]
    }
    const draft = {
      ...emptyCondition(spec),
      operator: 'gte',
      single: '2',
      event: 'view_itinerary',
      withinDays: ''
    }

    expect(conditionItem(draft, spec)).toEqual({
      field: 'counted',
      operator: 'gte',
      value: 2,
      event: 'view_itinerary'
    })
    expect(conditionItem({ ...draft, event: '' }, spec)).toBeNull()
    expect(conditionItem({
      ...emptyCondition({ field: 'plain', operators: ['eq'], value: 'string' }),
      operator: 'eq',
      single: 'OPENING',
      event: 'view_itinerary',
      withinDays: '14'
    }, {
      field: 'plain',
      operators: ['eq'],
      value: 'string'
    })).toEqual({
      field: 'plain',
      operator: 'eq',
      value: 'OPENING'
    })
  })
})
