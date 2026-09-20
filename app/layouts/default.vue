<script setup lang="ts">
import { visibleNav } from '../navigation/guards'

const { t } = useI18n()
const { sectionId, section, currentItem } = useSystem()
const { can, hasSection } = useAuth()
const route = useRoute()
const { openNew } = useNewReservation()
const { count: requestCount, allowed: showRequestBadge, startPolling } = useOpenRequests()

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

const pageTitle = computed(() => {
  return currentItem.value ? t(currentItem.value.labelKey) : t(section.value.labelKey)
})

useHead(() => ({
  title: pageTitle.value
}))

onMounted(() => {
  startPolling()
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
            {{ item.glyph }} {{ t(item.labelKey) }}
            <span
              v-if="item.badge && showRequestBadge"
              class="nav-badge pill p-req"
            >{{ requestCount }}</span>
          </NuxtLink>
        </div>
      </template>

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
        <h1>{{ pageTitle }}</h1>
        <div
          class="drbar-slot"
          aria-hidden="true"
        />
        <div class="who">
          <ShellSectionSwitch v-if="showSectionSwitch" />
          <span class="mono">{{ t('shell.loggedInAs') }}</span>
          <ShellWhoMenu />
          <AnkThemeToggle />
          <UButton
            v-if="showNewReservation"
            color="primary"
            @click="onNewReservation"
          >
            {{ t('shell.newReservation') }}
          </UButton>
          <span
            v-if="sectionId === 'crm'"
            class="sysbadge sys-rms"
            :title="t('shell.syncBadge')"
          >
            {{ t('shell.syncBadge') }}
          </span>
          <ShellApiStatus />
        </div>
      </div>
      <slot />
    </main>
  </div>
</template>
