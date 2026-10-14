<script setup lang="ts">
import { visibleNav } from '../navigation/guards'
import { navIcon } from '../navigation/icons'

const { t } = useI18n()
const colorMode = useColorMode()
const { sectionId, section, currentItem, currentGroup } = useSystem()
const { can, hasSection } = useAuth()
const route = useRoute()
const { openNew } = useNewReservation()
const { count: requestCount, allowed: showRequestBadge, startPolling } = useOpenRequests()
const {
  total: alertTotal,
  tone: alertTone,
  visible: showAlertBell,
  startPolling: startAlertPolling
} = useAlertCounts()

const alertsTo = computed(() => {
  return sectionId.value === 'crm' ? '/crm/engine/alerts' : '/rms/operations/alerts'
})

function onNewReservation(): void {
  if (route.path === '/rms/reservations/bookings') {
    openNew()
    return
  }

  void navigateTo({
    path: '/rms/reservations/bookings',
    query: { new: '1' }
  })
}

const nav = computed(() => visibleNav(section.value, permission => can(permission)))
const showSectionSwitch = computed(() => hasSection('rms') && hasSection('crm'))
const showNewReservation = computed(() => sectionId.value === 'rms' && can('bookings.create'))
const showCopilot = computed(() => can('copilot.use'))
const { open: copilotOpen, toggle: toggleCopilot } = useCopilot()

const pageTitle = computed(() => {
  return currentItem.value ? t(currentItem.value.labelKey) : t(section.value.labelKey)
})

const showCrumb = computed(() => currentGroup.value !== undefined && currentItem.value !== undefined)

const pageIcon = computed(() => navIcon(currentItem.value?.to ?? ''))

const isDark = computed(() => colorMode.value === 'dark')

const themeLabel = computed(() => {
  return isDark.value ? t('shell.themeToLight') : t('shell.themeToDark')
})

function toggleTheme(): void {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

useHead(() => ({
  title: pageTitle.value
}))

function onCopilotShortcut(event: KeyboardEvent): void {
  if (!showCopilot.value) {
    return
  }

  if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    toggleCopilot()
  }
}

onMounted(() => {
  startPolling()
  startAlertPolling()
  window.addEventListener('keydown', onCopilotShortcut)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onCopilotShortcut)
})
</script>

<template>
  <div class="app">
    <aside>
      <div class="brand">
        <img
          src="/brand/wordmark-dark.png"
          alt="ANAKATA"
          class="brand-mark--dark"
          draggable="false"
        >
        <img
          src="/brand/wordmark-light.png"
          alt="ANAKATA"
          class="brand-mark--light"
          draggable="false"
        >
        <small>{{ t(section.brandSubtitleKey) }}</small>
      </div>

      <nav class="nav-scroll">
        <template
          v-for="group in nav"
          :key="group.id"
        >
          <div class="navsec">
            {{ t(group.labelKey) }}
          </div>
          <div class="nav">
            <NuxtLink
              v-for="item in group.items"
              :key="item.id"
              :to="item.to"
              :class="{ on: item.to === $route.path }"
            >
              <UIcon
                :name="navIcon(item.to)"
                class="nav-icon"
              />
              <span class="nav-label">{{ t(item.labelKey) }}</span>
              <span
                v-if="item.badge && showRequestBadge"
                class="nav-badge pill p-req"
              >{{ requestCount }}</span>
            </NuxtLink>
          </div>
        </template>
      </nav>

      <img
        class="sideprow"
        src="/brand/prow.png"
        alt=""
        width="36"
        height="19"
        draggable="false"
      >
    </aside>

    <main>
      <div
        class="tophead"
        :class="sectionId === 'rms' ? 'tophead--rms' : 'tophead--crm'"
      >
        <span
          class="tophead-tile"
          aria-hidden="true"
        >
          <UIcon
            :name="pageIcon"
            class="tophead-tile-icon"
          />
        </span>
        <div class="tophead-titles">
          <p
            v-if="showCrumb && currentGroup && currentItem"
            class="tophead-crumb"
          >
            <span>{{ t(currentGroup.labelKey) }}</span>
            <span class="tophead-crumb-sep">/</span>
            <span class="tophead-crumb-page">{{ t(currentItem.labelKey) }}</span>
          </p>
          <h1>{{ pageTitle }}</h1>
        </div>
        <div
          class="drbar-slot"
          aria-hidden="true"
        />
        <div class="who">
          <NuxtLink
            v-if="showAlertBell"
            :to="alertsTo"
            class="alert-bell"
            :aria-label="t('shell.alerts')"
          >
            <svg
              class="alert-bell-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M8 1.5a4.5 4.5 0 0 0-4.5 4.5v2.2L2 10.5h12l-1.5-2.3V6A4.5 4.5 0 0 0 8 1.5z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <path
                d="M6.4 12.2a1.6 1.6 0 0 0 3.2 0"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>
            <span
              class="pill"
              :class="alertTone"
            >{{ alertTotal }}</span>
          </NuxtLink>
          <ShellSectionSwitch v-if="showSectionSwitch" />
          <ShellWhoMenu />
          <ShellLocaleSwitch />
          <UButton
            v-if="showCopilot"
            color="neutral"
            variant="outline"
            class="theme-toggle"
            :aria-label="t('copilot.open')"
            :aria-pressed="copilotOpen"
            @click="toggleCopilot"
          >
            <UIcon
              name="i-lucide-bot"
              class="theme-icon"
            />
          </UButton>
          <UButton
            color="neutral"
            variant="outline"
            class="theme-toggle"
            :aria-label="t('theme.toggleAria')"
            @click="toggleTheme"
          >
            <svg
              v-if="isDark"
              class="theme-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <circle
                cx="8"
                cy="8"
                r="2.2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <path
                d="M8 1.4v1.7M8 12.9v1.7M1.4 8h1.7M12.9 8h1.7M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>
            <svg
              v-else
              class="theme-icon"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M10.2 2.2a5.2 5.2 0 1 0 3.6 8.8 4.4 4.4 0 0 1-3.6-8.8z"
                fill="none"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>
            {{ themeLabel }}
          </UButton>
          <UButton
            v-if="showNewReservation"
            color="primary"
            @click="onNewReservation"
          >
            {{ t('shell.newReservation') }}
          </UButton>
        </div>
      </div>
      <slot />
    </main>
    <CopilotSheet v-if="showCopilot" />
  </div>
</template>
