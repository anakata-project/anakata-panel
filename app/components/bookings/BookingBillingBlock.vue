<script setup lang="ts">
import type { Booking } from '../../types/api'
import { applyApiFormError, firstApiMessage, type FormFieldErrors } from '../../utils/apiForm'

const props = defineProps<{
  booking: Booking
}>()

const emit = defineEmits<{
  updated: [booking?: Booking]
}>()

const { t } = useI18n()
const { request } = useApi()
const toast = useToast()

const editing = ref(false)
const name = ref('')
const address = ref('')
const email = ref('')
const phone = ref('')
const fieldErrors = ref<FormFieldErrors>({})
const formError = ref('')
const saving = ref(false)

function resetForm(): void {
  name.value = props.booking.billing_name ?? ''
  address.value = props.booking.billing_address ?? ''
  email.value = props.booking.billing_email ?? ''
  phone.value = props.booking.billing_phone ?? ''
  fieldErrors.value = {}
  formError.value = ''
}

function startEdit(): void {
  resetForm()
  editing.value = true
}

watch(() => props.booking.id, () => {
  editing.value = false
  resetForm()
})

async function save(): Promise<void> {
  saving.value = true
  fieldErrors.value = {}
  formError.value = ''

  try {
    const booking = await request(`/api/rms/bookings/${props.booking.id}/billing`, {
      method: 'PATCH',
      body: {
        billing_name: name.value === '' ? null : name.value,
        billing_address: address.value === '' ? null : address.value,
        billing_email: email.value === '' ? null : email.value,
        billing_phone: phone.value === '' ? null : phone.value
      }
    }) as Booking

    toast.add({ title: t('bookings.billingSavedToast') })
    editing.value = false
    emit('updated', booking)
  } catch (error: unknown) {
    if (!applyApiFormError(error, (fields, conflict) => {
      fieldErrors.value = fields
      formError.value = conflict
    })) {
      formError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
    }
  } finally {
    saving.value = false
  }
}

const shownName = computed(() => props.booking.billing_name ?? props.booking.contact.name)
const shownEmail = computed(() => props.booking.billing_email ?? props.booking.contact.email ?? '')
const shownPhone = computed(() => props.booking.billing_phone ?? props.booking.contact.phone ?? '')
const nameMuted = computed(() => props.booking.billing_name === null || props.booking.billing_name === '')
const addressMuted = computed(() => props.booking.billing_address === null || props.booking.billing_address === '')
const emailMuted = computed(() => props.booking.billing_email === null || props.booking.billing_email === '')
const phoneMuted = computed(() => props.booking.billing_phone === null || props.booking.billing_phone === '')
</script>

<template>
  <div
    id="booking-billing"
    class="sec"
  >
    <h4>{{ t('bookings.billingTitle') }}</h4>
    <p class="note">
      {{ t('bookings.billingSprintNote') }}
    </p>

    <template v-if="!editing">
      <div class="kv">
        <span>{{ t('bookings.billingName') }}</span>
        <span :class="{ 'billing-muted': nameMuted }">{{ shownName || '—' }}</span>
      </div>
      <div class="kv">
        <span>{{ t('bookings.billingAddress') }}</span>
        <span :class="{ 'billing-muted': addressMuted }">{{ booking.billing_address || '—' }}</span>
      </div>
      <div class="kv">
        <span>{{ t('bookings.billingEmail') }}</span>
        <span :class="{ 'billing-muted': emailMuted }">{{ shownEmail || '—' }}</span>
      </div>
      <div class="kv">
        <span>{{ t('bookings.billingPhone') }}</span>
        <span :class="{ 'billing-muted': phoneMuted }">{{ shownPhone || '—' }}</span>
      </div>
      <UButton
        v-if="booking.can_act"
        variant="outline"
        @click="startEdit"
      >
        {{ t('bookings.billingEdit') }}
      </UButton>
    </template>

    <form
      v-else
      class="billing-form"
      @submit.prevent="save"
    >
      <div
        v-if="formError"
        class="warnbox"
      >
        {{ formError }}
      </div>
      <div class="field">
        <label for="billing-name">{{ t('bookings.billingName') }}</label>
        <input
          id="billing-name"
          v-model="name"
          type="text"
        >
        <p
          v-if="fieldErrors.billing_name"
          class="pline-err"
        >
          {{ fieldErrors.billing_name }}
        </p>
      </div>
      <div class="field">
        <label for="billing-address">{{ t('bookings.billingAddress') }}</label>
        <textarea
          id="billing-address"
          v-model="address"
          rows="3"
        />
        <p
          v-if="fieldErrors.billing_address"
          class="pline-err"
        >
          {{ fieldErrors.billing_address }}
        </p>
      </div>
      <div class="field">
        <label for="billing-email">{{ t('bookings.billingEmail') }}</label>
        <input
          id="billing-email"
          v-model="email"
          type="email"
        >
        <p
          v-if="fieldErrors.billing_email"
          class="pline-err"
        >
          {{ fieldErrors.billing_email }}
        </p>
      </div>
      <div class="field">
        <label for="billing-phone">{{ t('bookings.billingPhone') }}</label>
        <input
          id="billing-phone"
          v-model="phone"
          type="text"
        >
        <p
          v-if="fieldErrors.billing_phone"
          class="pline-err"
        >
          {{ fieldErrors.billing_phone }}
        </p>
      </div>
      <div class="transbtns">
        <UButton
          type="submit"
          :loading="saving"
          :disabled="saving"
        >
          {{ t('bookings.save') }}
        </UButton>
        <UButton
          variant="outline"
          :disabled="saving"
          @click="editing = false"
        >
          {{ t('bookings.cancel') }}
        </UButton>
      </div>
    </form>
  </div>
</template>
