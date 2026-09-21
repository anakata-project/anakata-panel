<script setup lang="ts">
import { AGENCY_COUNTRIES } from './agencyHelpers'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  defaultPct: number
  capPct: number
  submitting: boolean
  error: string
}>()

const emit = defineEmits<{
  submit: [payload: {
    name: string
    contact: string
    email: string
    country: string
    network: string
    commission_pct: number
  }]
}>()

const { t } = useI18n()

const name = ref('')
const contact = ref('')
const email = ref('')
const country = ref('US')
const network = ref('')
const commission = ref(10)

const overCap = computed(() => commission.value > props.capPct)

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  name.value = ''
  contact.value = ''
  email.value = ''
  country.value = 'US'
  network.value = ''
  commission.value = props.defaultPct
})

function submit(): void {
  if (name.value.trim() === '' || email.value.trim() === '') {
    return
  }

  emit('submit', {
    name: name.value.trim(),
    contact: contact.value.trim(),
    email: email.value.trim(),
    country: country.value,
    network: network.value.trim(),
    commission_pct: commission.value
  })
}
</script>

<template>
  <UModal
    :open="open"
    :title="t('agencies.registerTitle')"
    @update:open="open = $event"
  >
    <template #body>
      <form
        class="modal-form"
        @submit.prevent="submit"
      >
        <div class="bid">
          {{ t('agencies.registerBid') }}
        </div>
        <div
          v-if="error"
          class="warnbox"
        >
          {{ error }}
        </div>
        <div class="cols2">
          <div class="field">
            <label for="ar-n">{{ t('agencies.name') }}</label>
            <input
              id="ar-n"
              v-model="name"
            >
          </div>
          <div class="field">
            <label for="ar-c">{{ t('agencies.contact') }}</label>
            <input
              id="ar-c"
              v-model="contact"
            >
          </div>
        </div>
        <div class="cols2">
          <div class="field">
            <label for="ar-e">{{ t('agencies.email') }}</label>
            <input
              id="ar-e"
              v-model="email"
              type="email"
            >
          </div>
          <div class="field">
            <label for="ar-co">{{ t('agencies.country') }}</label>
            <select
              id="ar-co"
              v-model="country"
            >
              <option
                v-for="item in AGENCY_COUNTRIES"
                :key="item.value"
                :value="item.value"
              >
                {{ item.label }}
              </option>
            </select>
          </div>
        </div>
        <div class="cols2">
          <div class="field">
            <label for="ar-nw">{{ t('agencies.network') }}</label>
            <input
              id="ar-nw"
              v-model="network"
              :placeholder="t('agencies.networkPlaceholder')"
            >
          </div>
          <div class="field">
            <label for="ar-cm">{{ t('agencies.commissionPct') }}</label>
            <input
              id="ar-cm"
              v-model.number="commission"
              type="number"
              min="0"
              max="30"
            >
          </div>
        </div>
        <p
          v-if="overCap"
          class="warnbox"
        >
          {{ t('agencies.overCapWarn', { cap: String(capPct) }) }}
        </p>
        <div class="modal-actions">
          <UButton
            variant="outline"
            :disabled="submitting"
            @click="open = false"
          >
            {{ t('bookings.cancel') }}
          </UButton>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting || name.trim() === '' || email.trim() === ''"
          >
            {{ t('agencies.registerSubmit') }}
          </UButton>
        </div>
      </form>
    </template>
  </UModal>
</template>
