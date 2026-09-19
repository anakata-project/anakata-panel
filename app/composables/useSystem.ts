import { LAST_PATH_KEYS, sections } from '../sections'
import { visibleNav } from '../navigation/guards'
import { findNavItem } from '../navigation/types'
import type { SectionId } from '../navigation/types'

function sectionFromPath(path: string): SectionId {
  return path.startsWith('/crm') ? 'crm' : 'rms'
}

function isRememberablePath(path: string): boolean {
  return (path.startsWith('/rms/') || path.startsWith('/crm/'))
    && path !== '/crm/pipeline'
}

export function useSystem() {
  const route = useRoute()
  const { can } = useAuth()

  const sectionId = computed<SectionId>(() => sectionFromPath(route.path))
  const section = computed(() => sections[sectionId.value])
  const currentItem = computed(() => {
    return findNavItem(visibleNav(section.value, permission => can(permission)), route.path)
  })

  function remember(path: string): void {
    if (!import.meta.client || !isRememberablePath(path)) {
      return
    }

    localStorage.setItem(LAST_PATH_KEYS[sectionFromPath(path)], path)
  }

  function lastPath(id: SectionId): string {
    const home = sections[id].home

    if (!import.meta.client) {
      return home
    }

    const remembered = localStorage.getItem(LAST_PATH_KEYS[id])

    if (!remembered) {
      return home
    }

    if (findNavItem(visibleNav(sections[id], permission => can(permission)), remembered)) {
      return remembered
    }

    return home
  }

  function switchTo(id: SectionId): void {
    if (id === sectionId.value) {
      return
    }

    void navigateTo(lastPath(id))
  }

  watch(() => route.path, (path) => {
    remember(path)
  }, { immediate: true })

  return {
    sectionId,
    section,
    currentItem,
    switchTo,
    lastPath
  }
}
