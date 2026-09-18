<script setup lang="ts">
const route = useRoute()
const group = computed(() => String(route.params.group))
const item = computed(() => String(route.params.item))
</script>

<template>
  <ShellPlaceholderPage
    :key="`${group}-${item}`"
    section="crm"
    :group="group"
    :item="item"
  />
</template>
