<script setup lang="ts">
import type { JourneyEnrolment } from '../../types/api'

defineProps<{
  enrolment: JourneyEnrolment
}>()

const { t } = useI18n()
const { format } = useDates()
</script>

<template>
  <div class="taskrow">
    <div>
      <b>{{ enrolment.journey_key }}</b>
      <span class="pill">{{ enrolment.status }}</span>
    </div>
    <p v-if="enrolment.step">
      {{ enrolment.step.name }}
    </p>
    <p class="mono">
      {{ format(enrolment.next_due_at, 'dateTime') }}
    </p>
    <p v-if="enrolment.exit_reason">
      {{ enrolment.exit_reason }}
    </p>
    <p
      v-for="(send, index) in enrolment.sends"
      :key="`${String(enrolment.id)}-${String(index)}`"
    >
      {{ t('crmJourneys.sent', { when: format(send.sent_at, 'dateTime') }) }}
      <NuxtLink :to="`/crm/marketing/journeys?template=${encodeURIComponent(send.template_key)}`">
        {{ send.template_key }}
      </NuxtLink>
    </p>
  </div>
</template>
