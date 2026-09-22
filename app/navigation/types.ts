import type { Permission } from '../types/api'

export type NavItem = {
  id: string
  labelKey: string
  glyph: string
  to: string
  sprint: number | 'later'
  badge?: boolean
  // Later sprints set their own. Only Permissions + Business Rules are gated in sprint 1.
  permission?: Permission | Array<Permission>
}

export type NavGroup = {
  id: string
  labelKey: string
  items: Array<NavItem>
}

export type SectionId = 'rms' | 'crm'

export type Section = {
  id: SectionId
  labelKey: string
  home: string
  brandSubtitleKey: string
  nav: Array<NavGroup>
}

export function findNavItem(nav: Array<NavGroup>, path: string): NavItem | undefined {
  for (const group of nav) {
    const match = group.items.find(item => item.to === path)
    if (match) {
      return match
    }
  }

  return undefined
}

export function findNavItemBySlugs(
  nav: Array<NavGroup>,
  section: SectionId,
  group: string,
  item: string
): NavItem | undefined {
  return findNavItem(nav, `/${section}/${group}/${item}`)
}
