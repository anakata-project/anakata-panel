import { LAST_PATH_KEYS, sections } from '../sections'
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

  const sectionId = computed<SectionId>(() => sectionFromPath(route.path))
  const section = computed(() => sections[sectionId.value])
  const currentItem = computed(() => findNavItem(section.value.nav, route.path))

  function remember(path: string): void {
    if (!import.meta.client || !isRememberablePath(path)) {
      return
    }

    localStorage.setItem(LAST_PATH_KEYS[sectionFromPath(path)], path)
  }

  function lastPath(id: SectionId): string {
    if (!import.meta.client) {
      return sections[id].home
    }

    return localStorage.getItem(LAST_PATH_KEYS[id]) || sections[id].home
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
