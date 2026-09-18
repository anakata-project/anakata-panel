<script setup lang="ts">
import { findNavItemBySlugs } from '../../navigation/types'
import type { SectionId } from '../../navigation/types'
import { sections } from '../../sections'

const props = defineProps<{
  section: SectionId
  group: string
  item: string
}>()

const { t } = useI18n()

const navItem = findNavItemBySlugs(
  sections[props.section].nav,
  props.section,
  props.group,
  props.item
)

if (!navItem) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Page not found'
  })
}

const title = computed(() => t(navItem.labelKey))
</script>

<template>
  <AnkPanel :title="title">
    <p class="placeholder-copy">
      {{ t('pages.comingIn', { n: navItem.sprint }) }}
    </p>
  </AnkPanel>
</template>
