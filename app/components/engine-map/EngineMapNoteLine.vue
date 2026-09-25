<script setup lang="ts">
import type { EngineMapNote } from './catalogue'

const props = defineProps<{
  group: 'decisions' | 'open'
  note: EngineMapNote
}>()

const { t } = useI18n()

const title = computed(() => t(`engineMap.${props.group}.${props.note.id}.title`))
const body = computed(() => props.note.emphasis ? '' : t(`engineMap.${props.group}.${props.note.id}.body`))
const before = computed(() => props.note.emphasis ? t(`engineMap.${props.group}.${props.note.id}.before`) : '')
const emphasis = computed(() => props.note.emphasis ? t(`engineMap.${props.group}.${props.note.id}.emphasis`) : '')
const after = computed(() => props.note.emphasis ? t(`engineMap.${props.group}.${props.note.id}.after`) : '')
</script>

<template>
  <b>{{ title }}</b>
  —
  <template v-if="note.emphasis">
    {{ before }}<b>{{ emphasis }}</b>{{ after }}
  </template>
  <template v-else>
    {{ body }}
  </template>
</template>
