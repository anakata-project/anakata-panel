<script setup lang="ts">
import type { Itinerary } from '../../types/api'
import { completenessBar, statusPillClass } from './itineraryHelpers'

const props = defineProps<{
  itinerary: Itinerary
}>()

const emit = defineEmits<{
  open: []
}>()

const { t } = useI18n()

const bar = computed(() => completenessBar(props.itinerary.completeness))

const heroStyle = computed(() => {
  if (props.itinerary.hero_image_url) {
    return { background: `url(${props.itinerary.hero_image_url}) center / cover` }
  }

  return { background: props.itinerary.fallback_gradient }
})

const liveLabel = computed(() => {
  return props.itinerary.live_departures_count === 1
    ? t('itineraries.liveOne')
    : t('itineraries.liveMany', { n: String(props.itinerary.live_departures_count) })
})

const totalLabel = computed(() => {
  return props.itinerary.departures_count === 1
    ? t('itineraries.totalOne')
    : t('itineraries.totalMany', { n: String(props.itinerary.departures_count) })
})

const daysLabel = computed(() => {
  return props.itinerary.day_plan.length === 1
    ? t('itineraries.daysOne')
    : t('itineraries.daysMany', { n: String(props.itinerary.day_plan.length) })
})

const faqsLabel = computed(() => {
  return props.itinerary.faqs.length === 1
    ? t('itineraries.faqsOne')
    : t('itineraries.faqsMany', { n: String(props.itinerary.faqs.length) })
})

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter') {
    emit('open')
  }
}
</script>

<template>
  <div
    class="itc"
    tabindex="0"
    @click="emit('open')"
    @keydown="onKeydown"
  >
    <div
      class="im"
      :style="heroStyle"
    >
      <span
        class="pill"
        :class="statusPillClass(itinerary.status)"
      >{{ itinerary.status }}</span>
      <span
        v-if="!itinerary.hero_image_url"
        class="mono noimg"
      >{{ t('itineraries.noPhoto') }}</span>
    </div>
    <div class="bd">
      <div
        class="mono"
        style="color: var(--iv38); letter-spacing: .14em"
      >
        {{ t('itineraries.daysNights', {
          code: itinerary.code,
          days: String(itinerary.days),
          nights: String(itinerary.nights)
        }) }}{{ itinerary.festive ? t('itineraries.festive') : '' }}
      </div>
      <h4>{{ itinerary.name }}</h4>
      <p>{{ itinerary.card_description }}</p>
      <div class="itmeta">
        <span>{{ liveLabel }}</span>
        <span>{{ totalLabel }}</span>
        <span>{{ daysLabel }}</span>
        <span>{{ faqsLabel }}</span>
      </div>
      <div
        class="cmp"
        :title="t('itineraries.cardSection')"
      >
        <i :style="{ width: `${itinerary.completeness.pct}%`, background: bar.barColor }" />
      </div>
      <div
        class="mono itin-complete"
        :style="{ color: bar.labelColor }"
      >
        {{ bar.label }}
      </div>
    </div>
  </div>
</template>
