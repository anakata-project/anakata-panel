import { CRM_HOME, RMS_HOME, sections } from '../sections'
import type { Permission } from '../types/api'
import { findNavItem } from './types'
import type { NavGroup, NavItem, Section, SectionId } from './types'

export const AUTH_PATHS = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/accept-invitation'
] as const

const REDIRECT_BLOCKLIST = [
  ...AUTH_PATHS,
  '/no-access'
] as const

export function pathnameOf(path: string): string {
  return path.split('?')[0]?.split('#')[0] ?? path
}

export function isAuthPath(path: string): boolean {
  return (AUTH_PATHS as ReadonlyArray<string>).includes(pathnameOf(path))
}

export function sanitizeRedirect(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null
  }

  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return null
  }

  if ((REDIRECT_BLOCKLIST as ReadonlyArray<string>).includes(pathnameOf(raw))) {
    return null
  }

  return raw
}

export function loginTarget(
  redirect?: unknown
): '/login' | { path: '/login', query: { redirect: string } } {
  const safe = sanitizeRedirect(redirect)

  if (safe === null) {
    return '/login'
  }

  return { path: '/login', query: { redirect: safe } }
}

export function firstAllowedHome(hasSection: (id: SectionId) => boolean): string {
  if (hasSection('rms')) {
    return RMS_HOME
  }

  if (hasSection('crm')) {
    return CRM_HOME
  }

  return '/no-access'
}

export function itemAllowed(item: NavItem, can: (permission: Permission) => boolean): boolean {
  if (!item.permission) {
    return true
  }

  const needed = Array.isArray(item.permission) ? item.permission : [item.permission]

  return needed.some(permission => can(permission))
}

export function visibleNav(section: Section, can: (permission: Permission) => boolean): Array<NavGroup> {
  return section.nav
    .map(group => ({
      ...group,
      items: group.items.filter(item => itemAllowed(item, can))
    }))
    .filter(group => group.items.length > 0)
}

export function sectionDecision(path: string, hasSection: (id: SectionId) => boolean): string | null {
  const pathname = pathnameOf(path)

  if (pathname === '/no-access') {
    if (hasSection('rms') || hasSection('crm')) {
      return firstAllowedHome(hasSection)
    }

    return null
  }

  if (pathname === '/' || pathname === '') {
    return firstAllowedHome(hasSection)
  }

  if (pathname === '/rms' || pathname.startsWith('/rms/')) {
    if (!hasSection('rms')) {
      return hasSection('crm') ? CRM_HOME : '/no-access'
    }

    return null
  }

  if (pathname === '/crm' || pathname.startsWith('/crm/')) {
    if (!hasSection('crm')) {
      return hasSection('rms') ? RMS_HOME : '/no-access'
    }

    return null
  }

  return null
}

export function pageDecision(
  path: string,
  can: (permission: Permission) => boolean
): { to: string, toast: true } | null {
  const pathname = pathnameOf(path)
  const sectionId: SectionId | null = pathname.startsWith('/crm')
    ? 'crm'
    : pathname.startsWith('/rms')
      ? 'rms'
      : null

  if (!sectionId) {
    return null
  }

  const section = sections[sectionId]
  const visible = visibleNav(section, can)

  if (findNavItem(visible, pathname)) {
    return null
  }

  if (findNavItem(section.nav, pathname)) {
    return { to: section.home, toast: true }
  }

  return null
}
