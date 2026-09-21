<script setup lang="ts">
import type { Booking, Delivery, IssuedDocument, Payment, PaymentLink, PaymentOptions } from '../../types/api'
import { applyApiFormError, firstApiMessage, type FormFieldErrors } from '../../utils/apiForm'
import {
  defaultPaymentAmount,
  labelFrom,
  paymentStatusPillClass,
  recordableOptions,
  signedMoney
} from './paymentHelpers'
import MarkWireModal from './MarkWireModal.vue'
import DocumentConfirmModal from '../documents/DocumentConfirmModal.vue'
import DocumentPreviewModal from '../documents/DocumentPreviewModal.vue'

const props = defineProps<{
  booking: Booking
}>()

const emit = defineEmits<{
  updated: [booking?: Booking]
}>()

type RecordedPayment = Payment & {
  booking: Booking
  warnings: Array<string>
}

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const canRecord = computed(() => can('payments.record'))

const payments = ref<Array<Payment>>([])
const paymentsLoading = ref(false)
const options = ref<PaymentOptions | null>(null)
const optionsStatus = ref<'loading' | 'ready' | 'failed'>('loading')

const kind = ref('')
const method = ref('')
const amount = ref(0)
const paidAt = ref('')
const note = ref('')
const warnings = ref<Array<string>>([])
const fieldErrors = ref<FormFieldErrors>({})
const formError = ref('')
const submitting = ref(false)

const markOpen = ref(false)
const markPaymentId = ref<number | null>(null)
const markSubmitting = ref(false)
const markError = ref('')

const issued = ref<Array<IssuedDocument>>([])
const deliveries = ref<Array<Delivery>>([])

const previewOpen = ref(false)
const previewTitle = ref('')
const previewHtmlPath = ref<string | null>(null)
const previewFilePath = ref<string | null>(null)
const previewFileName = ref('')

const linkSendOpen = ref(false)
const linkToSend = ref<PaymentLink | null>(null)
const linkSending = ref(false)
const linkSendError = ref('')

const wireOpen = ref(false)
const wireSending = ref(false)
const wireError = ref('')
const wireWarning = ref('')
const lastWireTo = ref<Array<string>>([])

const kindOptions = computed(() => recordableOptions(options.value?.kinds ?? []))
const methodOptions = computed(() => recordableOptions(options.value?.methods ?? []))
const formReady = computed(() => optionsStatus.value === 'ready' && options.value !== null)
const stripeTestMode = computed(() => props.booking.payment_links.some(link => link.mode === 'test'))

function resetForm(): void {
  const kinds = kindOptions.value
  const methods = methodOptions.value
  const preferDeposit = props.booking.paid === 0

  kind.value = (preferDeposit
    ? kinds.find(item => item.value === 'DEPOSIT')
    : kinds.find(item => item.value === 'BALANCE'))?.value
    ?? kinds[0]?.value
    ?? ''
  method.value = methods[0]?.value ?? ''
  amount.value = defaultPaymentAmount(props.booking)
  paidAt.value = ''
  note.value = ''
  fieldErrors.value = {}
  formError.value = ''
}

async function loadLedger(): Promise<void> {
  paymentsLoading.value = true

  try {
    const result = await request(`/api/rms/bookings/${props.booking.id}/payments`) as { data: Array<Payment> }
    payments.value = result.data
  } finally {
    paymentsLoading.value = false
  }
}

async function loadOptions(): Promise<void> {
  optionsStatus.value = 'loading'

  try {
    options.value = await request('/api/rms/payments/options') as PaymentOptions
    optionsStatus.value = 'ready'
    resetForm()
  } catch {
    options.value = null
    optionsStatus.value = 'failed'
  }
}

const lastPaymentLink = computed(() => {
  return deliveries.value.find(item => item.kind === 'PAYMENT_LINK') ?? null
})

const lastPaymentLinkLine = computed(() => {
  const delivery = lastPaymentLink.value

  if (delivery === null) {
    return ''
  }

  const when = delivery.sent_at ?? delivery.created_at ?? ''

  return t('payments.lastLinkEmail', {
    status: delivery.status,
    to: delivery.to.join(', '),
    date: when === '' ? '—' : format(when, 'dateTime')
  })
})

async function loadIssued(): Promise<void> {
  const result = await request(`/api/rms/bookings/${props.booking.id}/documents`) as { data: Array<IssuedDocument> }
  issued.value = result.data
}

async function loadDeliveries(): Promise<void> {
  const result = await request(`/api/rms/bookings/${props.booking.id}/deliveries`) as { data: Array<Delivery> }
  deliveries.value = result.data
}

onMounted(() => {
  void loadLedger()
  void loadOptions()
  void loadIssued()
  void loadDeliveries()
})

watch(() => props.booking.id, () => {
  issued.value = []
  deliveries.value = []
  wireWarning.value = ''
  lastWireTo.value = []
  void loadLedger()
  void loadIssued()
  void loadDeliveries()
})

function kindLabel(value: string): string {
  return labelFrom(options.value?.kinds ?? [], value)
}

function methodLabel(value: string): string {
  return labelFrom(options.value?.methods ?? [], value)
}

function startMark(payment: Payment): void {
  markPaymentId.value = payment.id
  markError.value = ''
  markOpen.value = true
}

async function submitMark(bankReference: string): Promise<void> {
  if (markPaymentId.value === null) {
    return
  }

  markSubmitting.value = true
  markError.value = ''

  try {
    await request(`/api/rms/payments/${markPaymentId.value}/mark-received`, {
      method: 'POST',
      body: { bank_reference: bankReference }
    })
    markOpen.value = false
    toast.add({ title: t('payments.markedToast') })
    await loadLedger()
    await loadIssued()
    emit('updated')
  } catch (error: unknown) {
    markError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    markSubmitting.value = false
  }
}

async function submitRecord(): Promise<void> {
  if (!canRecord.value || !formReady.value) {
    return
  }

  submitting.value = true
  fieldErrors.value = {}
  formError.value = ''
  warnings.value = []

  try {
    const recorded = await request(`/api/rms/bookings/${props.booking.id}/payments`, {
      method: 'POST',
      body: {
        kind: kind.value,
        method: method.value,
        amount: amount.value,
        paid_at: paidAt.value === '' ? null : paidAt.value,
        note: note.value === '' ? null : note.value
      }
    }) as RecordedPayment

    warnings.value = recorded.warnings
    toast.add({ title: t('payments.recordedToast') })
    await loadLedger()
    await loadIssued()
    emit('updated', recorded.booking)
    resetForm()
  } catch (error: unknown) {
    if (!applyApiFormError(error, (fields, conflict) => {
      fieldErrors.value = fields
      formError.value = conflict
    })) {
      formError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
    }
  } finally {
    submitting.value = false
  }
}

async function createLink(linkKind: 'DEPOSIT' | 'BALANCE'): Promise<void> {
  formError.value = ''

  try {
    await request(`/api/rms/bookings/${props.booking.id}/payment-link`, {
      method: 'POST',
      body: { kind: linkKind }
    })
    toast.add({ title: t('payments.linkCreatedToast') })
    emit('updated')
  } catch (error: unknown) {
    formError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  }
}

async function cancelLink(link: PaymentLink): Promise<void> {
  formError.value = ''

  try {
    await request(`/api/rms/payment-links/${link.id}/cancel`, { method: 'POST' })
    toast.add({ title: t('payments.linkCancelledToast') })
    emit('updated')
  } catch (error: unknown) {
    formError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  }
}

async function copyLink(url: string): Promise<void> {
  await navigator.clipboard.writeText(url)
  toast.add({ title: t('payments.linkCopiedToast') })
}

function receiptFor(payment: Payment): IssuedDocument | null {
  return issued.value.find(document => document.kind === 'RECEIPT' && document.payment_id === payment.id) ?? null
}

function openReceipt(payment: Payment): void {
  const document = receiptFor(payment)

  if (document === null) {
    return
  }

  previewTitle.value = document.kind_label
  previewHtmlPath.value = `/api/rms/documents/${document.id}/html`
  previewFilePath.value = `/api/rms/documents/${document.id}/file`
  previewFileName.value = `${document.kind}-v${String(document.version)}.pdf`
  previewOpen.value = true
}

function startLinkSend(link: PaymentLink): void {
  linkToSend.value = link
  linkSendError.value = ''
  linkSendOpen.value = true
}

async function submitLinkSend(): Promise<void> {
  const link = linkToSend.value

  if (link === null) {
    return
  }

  linkSending.value = true
  linkSendError.value = ''

  try {
    await request(`/api/rms/payment-links/${link.id}/send`, { method: 'POST' }) as Delivery
    toast.add({ title: t('payments.linkSentToast') })
    linkSendOpen.value = false
    linkToSend.value = null
    await loadDeliveries()
    emit('updated')
  } catch (error: unknown) {
    linkSendError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    linkSending.value = false
  }
}

function startWireSend(): void {
  wireError.value = ''
  wireOpen.value = true
}

function previewWire(): void {
  previewTitle.value = t('payments.wireTitle')
  previewHtmlPath.value = `/api/rms/bookings/${props.booking.id}/documents/WIRE_INSTRUCTIONS/html`
  previewFilePath.value = null
  previewFileName.value = ''
  previewOpen.value = true
}

async function submitWireSend(): Promise<void> {
  wireSending.value = true
  wireError.value = ''

  try {
    const delivery = await request(`/api/rms/bookings/${props.booking.id}/wire-instructions/send`, {
      method: 'POST'
    }) as Delivery
    toast.add({ title: t('payments.wireSentToast') })
    wireOpen.value = false
    lastWireTo.value = delivery.to

    if (delivery.warning !== null && delivery.warning !== '') {
      wireWarning.value = delivery.warning
    }

    await loadDeliveries()
    await loadIssued()
    emit('updated')
  } catch (error: unknown) {
    wireError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    wireSending.value = false
  }
}
</script>

<template>
  <div>
    <table class="list mini-t">
      <thead>
        <tr>
          <th>{{ t('payments.colDate') }}</th>
          <th>{{ t('payments.colType') }}</th>
          <th>{{ t('payments.colMethod') }}</th>
          <th>{{ t('payments.colReference') }}</th>
          <th>{{ t('payments.colAmount') }}</th>
          <th>{{ t('payments.colStatus') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-if="payments.length === 0 && !paymentsLoading"
          class="dr-empty"
        >
          <td colspan="6">
            {{ t('payments.empty') }}
          </td>
        </tr>
        <tr
          v-for="row in payments"
          :key="row.id"
        >
          <td class="nw">
            {{ format(row.date, 'short') }}
          </td>
          <td>{{ kindLabel(row.kind) }}</td>
          <td>
            {{ methodLabel(row.method) }}
            <div
              v-if="row.gateway_id"
              class="gmeta"
            >
              {{ row.gateway_id }}
            </div>
          </td>
          <td class="mono">
            {{ row.reference }}
          </td>
          <td
            class="nw"
            :class="{ 'pay-amt-refund': row.amount < 0 }"
          >
            {{ signedMoney(row.amount, money) }}
          </td>
          <td>
            <template v-if="row.status === 'AWAITING_WIRE'">
              <button
                v-if="row.can_mark_wire"
                type="button"
                class="mini"
                @click="startMark(row)"
              >
                {{ t('payments.markReceived') }}
              </button>
              <span
                v-else
                class="pill p-pend"
              >{{ t('payments.awaitingWire') }}</span>
            </template>
            <span
              v-else
              class="pill"
              :class="paymentStatusPillClass(row.status)"
            >{{ row.status.replaceAll('_', ' ') }}</span>
            <button
              v-if="row.status === 'SETTLED' && row.amount > 0 && receiptFor(row) !== null"
              type="button"
              class="lnk pay-receipt"
              @click="openReceipt(row)"
            >
              {{ t('payments.receipt') }}
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <template v-if="canRecord">
      <div class="sec">
        <h4>{{ t('payments.recordTitle') }}</h4>
        <div
          v-if="warnings.length > 0"
          class="warnbox"
        >
          <p
            v-for="(item, index) in warnings"
            :key="index"
          >
            {{ item }}
          </p>
        </div>
        <div
          v-if="formError"
          class="warnbox"
        >
          {{ formError }}
        </div>
        <p
          v-if="!formReady"
          class="note"
        >
          {{ optionsStatus === 'failed' ? t('payments.optionsFailed') : t('payments.optionsLoading') }}
        </p>
        <form
          v-else
          class="pay-form"
          @submit.prevent="submitRecord"
        >
          <div class="cols2">
            <div class="field">
              <label for="pay-kind">{{ t('payments.kind') }}</label>
              <select
                id="pay-kind"
                v-model="kind"
              >
                <option
                  v-for="item in kindOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
              <p
                v-if="fieldErrors.kind"
                class="pline-err"
              >
                {{ fieldErrors.kind }}
              </p>
            </div>
            <div class="field">
              <label for="pay-method">{{ t('payments.method') }}</label>
              <select
                id="pay-method"
                v-model="method"
              >
                <option
                  v-for="item in methodOptions"
                  :key="item.value"
                  :value="item.value"
                >
                  {{ item.label }}
                </option>
              </select>
              <p
                v-if="fieldErrors.method"
                class="pline-err"
              >
                {{ fieldErrors.method }}
              </p>
            </div>
          </div>
          <div class="cols2">
            <div class="field">
              <label for="pay-amount">{{ t('payments.amount') }}</label>
              <input
                id="pay-amount"
                v-model.number="amount"
                type="number"
                min="1"
                step="1"
              >
              <p
                v-if="fieldErrors.amount"
                class="pline-err"
              >
                {{ fieldErrors.amount }}
              </p>
            </div>
            <div class="field">
              <label for="pay-date">{{ t('payments.paidAt') }}</label>
              <input
                id="pay-date"
                v-model="paidAt"
                type="date"
              >
              <p
                v-if="fieldErrors.paid_at"
                class="pline-err"
              >
                {{ fieldErrors.paid_at }}
              </p>
            </div>
          </div>
          <div class="field">
            <label for="pay-note">{{ t('payments.note') }}</label>
            <input
              id="pay-note"
              v-model="note"
              type="text"
            >
            <p
              v-if="fieldErrors.note"
              class="pline-err"
            >
              {{ fieldErrors.note }}
            </p>
          </div>
          <UButton
            type="submit"
            :loading="submitting"
            :disabled="submitting"
          >
            {{ t('payments.record') }}
          </UButton>
        </form>
      </div>

      <div class="sec">
        <h4>{{ t('payments.linksTitle') }}</h4>
        <p
          v-if="stripeTestMode"
          class="note"
        >
          {{ t('payments.stripeTestMode') }}
        </p>
        <p
          v-if="lastPaymentLinkLine !== ''"
          class="note"
        >
          {{ lastPaymentLinkLine }}
        </p>
        <div class="transbtns">
          <UButton
            variant="outline"
            @click="createLink('DEPOSIT')"
          >
            {{ t('payments.createDepositLink') }}
          </UButton>
          <UButton
            variant="outline"
            @click="createLink('BALANCE')"
          >
            {{ t('payments.createBalanceLink') }}
          </UButton>
        </div>
        <ul
          v-if="booking.payment_links.length > 0"
          class="pay-links"
        >
          <li
            v-for="link in booking.payment_links"
            :key="link.id"
            class="pay-link-row"
          >
            <span class="pill">{{ link.status }}</span>
            <span class="pay-link-url">{{ link.url }}</span>
            <button
              type="button"
              class="mini"
              @click="copyLink(link.url)"
            >
              {{ t('payments.copyLink') }}
            </button>
            <button
              v-if="link.status === 'OPEN'"
              type="button"
              class="mini"
              @click="startLinkSend(link)"
            >
              {{ t('payments.sendLink') }}
            </button>
            <button
              v-if="link.status === 'OPEN'"
              type="button"
              class="mini"
              @click="cancelLink(link)"
            >
              {{ t('payments.cancelLink') }}
            </button>
          </li>
        </ul>
      </div>

      <div
        v-if="booking.status === 'PENDING_PAYMENT'"
        class="sec"
      >
        <h4>{{ t('payments.wireTitle') }}</h4>
        <div
          v-if="wireWarning !== ''"
          class="warnbox"
        >
          {{ wireWarning }}
        </div>
        <p
          v-if="lastWireTo.length > 0"
          class="note"
        >
          {{ t('payments.wireSentTo', { to: lastWireTo.join(', ') }) }}
        </p>
        <UButton
          variant="outline"
          @click="startWireSend"
        >
          {{ t('payments.sendWire') }}
        </UButton>
      </div>
    </template>
    <p
      v-else
      class="notice"
    >
      {{ t('payments.financeOnly') }}
    </p>
  </div>

  <MarkWireModal
    v-model:open="markOpen"
    :submitting="markSubmitting"
    :error="markError"
    @submit="submitMark"
  />

  <DocumentPreviewModal
    v-model:open="previewOpen"
    :title="previewTitle"
    :html-path="previewHtmlPath"
    :file-path="previewFilePath"
    :file-name="previewFileName"
  />

  <DocumentConfirmModal
    v-model:open="linkSendOpen"
    :title="t('payments.sendLinkTitle')"
    :body="t('payments.sendLinkBody')"
    :submitting="linkSending"
    :error="linkSendError"
    :confirm-label="t('payments.sendLink')"
    @confirm="submitLinkSend"
  />

  <DocumentConfirmModal
    v-model:open="wireOpen"
    :title="t('payments.sendWireTitle')"
    :body="t('payments.sendWireBody')"
    :submitting="wireSending"
    :error="wireError"
    :confirm-label="t('payments.sendWire')"
    :preview-label="t('bookings.docPreview')"
    @confirm="submitWireSend"
    @preview="previewWire"
  />
</template>
