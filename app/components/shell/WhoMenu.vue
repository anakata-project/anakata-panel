<script setup lang="ts">
const { t } = useI18n()
const { user, logout } = useAuth()

const label = computed(() => {
  if (!user.value) {
    return ''
  }

  return `${user.value.name} — ${user.value.role.name}`.toUpperCase()
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
    v-if="user"
    :items="items"
  >
    <button
      type="button"
      class="who-select"
      :aria-label="t('shell.whoAria')"
    >
      {{ label }}
    </button>
  </UDropdownMenu>
</template>
