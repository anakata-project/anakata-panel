export function stepsByBranch<T extends { branch: string }>(steps: Array<T>): Array<{ branch: string, steps: Array<T> }> {
  const order: Array<string> = []
  const groups = new Map<string, Array<T>>()

  for (const step of steps) {
    const existing = groups.get(step.branch)

    if (existing) {
      existing.push(step)
      continue
    }

    order.push(step.branch)
    groups.set(step.branch, [step])
  }

  return order.map(branch => ({
    branch,
    steps: groups.get(branch) ?? []
  }))
}

export function severalBranches(steps: Array<{ branch: string }>): boolean {
  return stepsByBranch(steps).length > 1
}

export function confirmSentence(journey: { contract: string | null, trigger: string }): string {
  if (journey.contract !== null && journey.contract !== '') {
    return journey.contract
  }

  return journey.trigger
}

export function kindPillClass(kind: string): string {
  return kind === 'MARKETING' ? 'hi' : 'ok'
}

export function disabledCatalogueSwitches<T extends { key: string, enabled: boolean }>(
  catalogueKeys: Array<string>,
  rows: Array<T>
): Array<T> {
  const byKey = new Map(rows.map(row => [row.key, row]))
  const seen = new Set<string>()
  const matches: Array<T> = []

  for (const key of catalogueKeys) {
    if (seen.has(key)) {
      continue
    }

    seen.add(key)
    const row = byKey.get(key)

    if (row && !row.enabled) {
      matches.push(row)
    }
  }

  return matches
}

export function templateByKey<T extends { key: string }>(key: string, templates: Array<T>): T | null {
  return templates.find(template => template.key === key) ?? null
}
