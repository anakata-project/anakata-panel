import {
  firstAllowedHome,
  isAuthPath,
  loginTarget,
  pageDecision,
  sectionDecision
} from '../navigation/guards'

export default defineNuxtRouteMiddleware(async (to) => {
  const { ensureMe, isSignedIn, hasSection, can } = useAuth()
  const { showForbiddenToast } = useForbiddenToast()

  await ensureMe()

  const has = (id: Parameters<typeof hasSection>[0]) => hasSection(id)

  if (isAuthPath(to.path)) {
    if (isSignedIn.value && to.path === '/login') {
      return navigateTo(firstAllowedHome(has))
    }

    return
  }

  if (!isSignedIn.value) {
    return navigateTo(loginTarget(to.fullPath))
  }

  const sectionTo = sectionDecision(to.path, has)

  if (sectionTo && sectionTo !== to.path) {
    return navigateTo(sectionTo)
  }

  const page = pageDecision(to.path, permission => can(permission))

  if (page) {
    showForbiddenToast()
    return navigateTo(page.to)
  }
})
