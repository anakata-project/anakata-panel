<script setup lang="ts">
const { t } = useI18n()
const { user, logout } = useAuth()

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(part => part.length > 0)
  const letters = parts
    .map(part => part.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, ''))
    .filter(part => part.length > 0)

  const first = letters[0]?.charAt(0) ?? ''
  const last = letters.length > 1 ? letters[letters.length - 1]?.charAt(0) ?? '' : ''

  return `${first}${last}`.toUpperCase()
}

const account = computed(() => {
  if (!user.value) {
    return null
  }

  return {
    name: user.value.name,
    role: user.value.role.name,
    initials: initials(user.value.name)
  }
})

const items = computed(() => [
  [
    {
      label: user.value?.email ?? '',
      disabled: true,
      class: 'who-email'
    }
  ],
  [
    {
      label: t('shell.signOut'),
      onSelect() {
        void logout()
      }
    }
  ]
])
</script>

<template>
  <UDropdownMenu
    v-if="account"
    :items="items"
  >
    <button
      type="button"
      class="who-select"
      :aria-label="t('shell.whoAria')"
    >
      <span class="who-initials">{{ account.initials }}</span>
      <span class="who-meta">
        <span class="who-name">{{ account.name }}</span>
        <span class="who-role">{{ account.role }}</span>
      </span>
    </button>
  </UDropdownMenu>
</template>
