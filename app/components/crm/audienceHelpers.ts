export function pinSuppressedLast<T extends { key: string }>(rows: Array<T>): Array<T> {
  const rest: Array<T> = []
  const suppressed: Array<T> = []

  for (const row of rows) {
    if (row.key === 'suppressed') {
      suppressed.push(row)
    } else {
      rest.push(row)
    }
  }

  return [...rest, ...suppressed]
}

export function dimensionClass(axis: string): string {
  if (axis === 'BEHAVIOUR') {
    return 'b'
  }

  if (axis === 'INTEREST') {
    return 'i'
  }

  if (axis === 'LOCATION') {
    return 'l'
  }

  if (axis === 'PROFILE' || axis === 'PROMOTION') {
    return 'p'
  }

  return ''
}

export function groupBySection<T extends { section: string, section_label: string }>(
  rows: Array<T>
): Array<{ section: string, label: string, rows: Array<T> }> {
  const groups: Array<{ section: string, label: string, rows: Array<T> }> = []

  for (const row of rows) {
    const last = groups.at(-1)

    if (last && last.section === row.section) {
      last.rows.push(row)
      continue
    }

    groups.push({
      section: row.section,
      label: row.section_label,
      rows: [row]
    })
  }

  return groups
}

export type VocabularyField = {
  field: string
  operators: Array<string>
  value: string
  values?: Array<string>
  params?: Array<{
    name: string
    type: string
    values?: Array<string>
  }>
}

export type ConditionDraft = {
  field: string
  operator: string
  single: string
  listText: string
  selected: Array<string>
  flag: boolean
  ageMin: string
  ageMax: string
  event: string
  withinDays: string
}

export type ConditionValue = string | number | boolean | Array<string> | Array<number>

export type ConditionItem = {
  field: string
  operator: string
  value: ConditionValue
  event?: string
  within_days?: number
}

export type SavedCondition = {
  field: string
  operator: string
  value: ConditionValue
  event?: string
  within_days?: number | null
}

export function emptyCondition(spec: VocabularyField): ConditionDraft {
  return {
    field: spec.field,
    operator: spec.operators[0] ?? '',
    single: '',
    listText: '',
    selected: [],
    flag: false,
    ageMin: '',
    ageMax: '',
    event: '',
    withinDays: ''
  }
}

export function draftFromSaved(item: SavedCondition, spec: VocabularyField): ConditionDraft {
  const draft = emptyCondition(spec)
  draft.operator = item.operator
  draft.event = item.event ?? ''
  draft.withinDays = typeof item.within_days === 'number' ? String(item.within_days) : ''

  if (typeof item.value === 'boolean') {
    draft.flag = item.value
    return draft
  }

  if (spec.value === 'age_range' && Array.isArray(item.value)) {
    draft.ageMin = String(item.value[0] ?? '')
    draft.ageMax = String(item.value[1] ?? '')
    return draft
  }

  if (Array.isArray(item.value)) {
    const texts = item.value.map(part => String(part))

    if (spec.values) {
      draft.selected = texts
    } else {
      draft.listText = texts.join(', ')
    }

    return draft
  }

  draft.single = String(item.value)
  return draft
}

function whole(text: string): number | null {
  if (!/^\d+$/.test(text)) {
    return null
  }

  return Number(text)
}

function tokens(text: string): Array<string> {
  return text.split(',').map(part => part.trim()).filter(part => part !== '')
}

function readValue(draft: ConditionDraft, spec: VocabularyField): ConditionValue | null {
  if (spec.value === 'boolean') {
    return draft.flag
  }

  if (spec.value === 'age_range') {
    const min = whole(draft.ageMin)
    const max = whole(draft.ageMax)

    if (min === null || max === null) {
      return null
    }

    return [min, max]
  }

  if (spec.value === 'integer') {
    if (draft.operator === 'in') {
      const parts = tokens(draft.listText)
      const numbers = parts.map(whole)

      if (parts.length === 0 || numbers.some(number => number === null)) {
        return null
      }

      return numbers.filter((number): number is number => number !== null)
    }

    return whole(draft.single)
  }

  if (draft.operator === 'in') {
    const list = spec.values ? draft.selected : tokens(draft.listText)

    if (list.length === 0) {
      return null
    }

    if (spec.value === 'country') {
      return list.map(code => code.toUpperCase())
    }

    return list
  }

  const single = draft.single.trim()

  if (single === '') {
    return null
  }

  if (spec.value === 'country') {
    return single.toUpperCase()
  }

  return single
}

export function conditionItem(draft: ConditionDraft, spec: VocabularyField): ConditionItem | null {
  const value = readValue(draft, spec)

  if (value === null || draft.operator === '') {
    return null
  }

  const item: ConditionItem = {
    field: spec.field,
    operator: draft.operator,
    value
  }

  for (const param of spec.params ?? []) {
    if (param.name === 'event') {
      if (draft.event === '') {
        return null
      }

      item.event = draft.event
    }

    if (param.name === 'within_days' && draft.withinDays !== '') {
      const days = whole(draft.withinDays)

      if (days === null) {
        return null
      }

      item.within_days = days
    }
  }

  return item
}

export function conditionDocument(
  match: string,
  drafts: Array<ConditionDraft>,
  fields: Array<VocabularyField>
): { match: string, items: Array<ConditionItem> } | null {
  if (match === '' || drafts.length === 0) {
    return null
  }

  const items: Array<ConditionItem> = []

  for (const draft of drafts) {
    const spec = fields.find(field => field.field === draft.field)

    if (!spec) {
      return null
    }

    const item = conditionItem(draft, spec)

    if (item === null) {
      return null
    }

    items.push(item)
  }

  return { match, items }
}
