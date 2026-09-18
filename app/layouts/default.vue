<script setup lang="ts">
const { t } = useI18n()
const { sectionId, section, currentItem } = useSystem()
const role = ref('admin')

const roleItems = computed(() => [
  { label: t('shell.roleAdmin'), value: 'admin' },
  { label: t('shell.roleManager'), value: 'manager' },
  { label: t('shell.roleSales'), value: 'agent' }
])

const pageTitle = computed(() => {
  return currentItem.value ? t(currentItem.value.labelKey) : t(section.value.labelKey)
})

useHead(() => ({
  title: pageTitle.value
}))
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
        v-for="group in section.nav"
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
              v-if="item.badge"
              class="nav-badge"
            />
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
          <ShellSectionSwitch />
          <span class="mono">{{ t('shell.loggedInAs') }}</span>
          <USelect
            v-model="role"
            :items="roleItems"
            value-key="value"
            size="sm"
            class="w-56"
            color="neutral"
          />
          <AnkThemeToggle />
          <UButton
            v-if="sectionId === 'rms'"
            color="primary"
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
