import type { ConfigVersionSummary } from '../types/api'

export type ConfigHistoryRow = {
  key: string
  version: number
  publishedAt: string | null
  who: string
  item: string
  path: string
  from: unknown
  to: unknown
  approval: string | null
}

export function flattenConfigHistory(
  versions: Array<ConfigVersionSummary>,
  labels: { system: string, initialValues: string }
): Array<ConfigHistoryRow> {
  const rows: Array<ConfigHistoryRow> = []

  for (const version of versions) {
    const who = version.published_by?.name ?? labels.system

    if (version.version === 1 && version.changes.length === 0) {
      rows.push({
        key: `${version.version}-initial`,
        version: version.version,
        publishedAt: version.published_at,
        who,
        item: labels.initialValues,
        path: '',
        from: null,
        to: null,
        approval: version.approval_reference
      })
      continue
    }

    version.changes.forEach((change, index) => {
      rows.push({
        key: `${version.version}-${change.path}-${index}`,
        version: version.version,
        publishedAt: version.published_at,
        who,
        item: change.label,
        path: change.path,
        from: change.from,
        to: change.to,
        approval: version.approval_reference
      })
    })
  }

  return rows
}
