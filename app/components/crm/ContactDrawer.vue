<script setup lang="ts">
import type {
  AgencyListItem,
  ContactMerge,
  ContactProfile,
  ContactType,
  ContactUnmergeResult,
  Paginated,
  PreferredChannel,
  TimelineItem
} from '../../types/api'
import type { FormFieldErrors } from '../../utils/apiForm'
import { applyApiFormError, firstApiMessage } from '../../utils/apiForm'
import { statusLabel } from '../bookings/bookingHelpers'
import ReasonModal from '../bookings/ReasonModal.vue'
import {
  filterLabel,
  formatAttribution,
  isUndoWindowOpen,
  matchMergeForTimeline,
  matchPartnerByEmail,
  parseEmailConflictContactId,
  segmentPillClass,
  shouldLookupPartner
} from './contactHelpers'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  profile: ContactProfile | null
  typeOptions: Array<{ value: string, label: string }>
  lifecycleOptions: Array<{ value: string, label: string }>
}>()

const emit = defineEmits<{
  updated: [profile: ContactProfile]
  reviewMerge: [currentId: number, otherId: number]
  openContact: [id: number]
  undone: []
}>()

const CHANNELS: Array<PreferredChannel> = ['EMAIL', 'WHATSAPP', 'PHONE']

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const name = ref('')
const email = ref('')
const phone = ref('')
const country = ref('')
const language = ref('')
const preferredChannel = ref<PreferredChannel>('EMAIL')
const type = ref<ContactType>('DIRECT_PASSENGER')
const fieldErrors = ref<FormFieldErrors>({})
const warn = ref('')
const conflictId = ref<number | null>(null)
const saving = ref(false)

const timelinePage = ref(1)
const timeline = ref<Paginated<TimelineItem> | null>(null)
const merges = ref<Array<ContactMerge>>([])
const partner = ref<AgencyListItem | null>(null)

const undoOpen = ref(false)
const undoTarget = ref<ContactMerge | null>(null)
const undoSubmitting = ref(false)
const undoError = ref('')

const canManage = computed(() => can('contacts.manage'))
const canMerge = computed(() => can('contacts.merge'))
const canRms = computed(() => can('panel.rms'))

const items = computed(() => timeline.value?.data ?? [])
const timelineMeta = computed(() => timeline.value?.meta)

function channelLabel(value: string): string {
  if (value === 'EMAIL') {
    return t('crmContacts.channelEmail')
  }

  if (value === 'WHATSAPP') {
    return t('crmContacts.channelWhatsapp')
  }

  if (value === 'PHONE') {
    return t('crmContacts.channelPhone')
  }

  return value
}

function applyProfile(profile: ContactProfile): void {
  name.value = profile.name
  email.value = profile.email ?? ''
  phone.value = profile.phone ?? ''
  country.value = profile.country ?? ''
  language.value = profile.language
  preferredChannel.value = profile.preferred_channel as PreferredChannel
  type.value = profile.type
  fieldErrors.value = {}
  warn.value = ''
  conflictId.value = null
}

async function loadTimeline(id: number): Promise<void> {
  const params = new URLSearchParams({
    page: String(timelinePage.value),
    per_page: '50'
  })

  timeline.value = await request(`/api/crm/contacts/${String(id)}/timeline?${params.toString()}`) as Paginated<TimelineItem>
}

async function loadMerges(): Promise<void> {
  if (!canMerge.value) {
    merges.value = []
    return
  }

  const all: Array<ContactMerge> = []
  let page = 1
  let last = 1

  while (page <= last) {
    const result = await request(`/api/crm/contact-merges?page=${String(page)}`) as Paginated<ContactMerge>
    all.push(...result.data)
    last = result.meta.last_page
    page += 1
  }

  merges.value = all
}

async function loadPartner(profile: ContactProfile): Promise<void> {
  partner.value = null

  if (!canRms.value || !shouldLookupPartner(profile.lifecycle, profile.type) || profile.email === null || profile.email === '') {
    return
  }

  const result = await request(`/api/rms/agencies?q=${encodeURIComponent(profile.email)}`) as { data: Array<AgencyListItem> }
  partner.value = matchPartnerByEmail(result.data, profile.email)
}

watch(
  () => [open.value, props.profile] as const,
  async ([isOpen, profile]) => {
    if (!isOpen || profile === null) {
      return
    }

    applyProfile(profile)
    timelinePage.value = 1
    await Promise.all([
      loadTimeline(profile.id),
      loadMerges(),
      loadPartner(profile)
    ])
  }
)

watch(timelinePage, async () => {
  if (props.profile !== null && open.value) {
    await loadTimeline(props.profile.id)
  }
})

async function save(): Promise<void> {
  if (props.profile === null) {
    return
  }

  saving.value = true
  fieldErrors.value = {}
  warn.value = ''
  conflictId.value = null

  try {
    const updated = await request(`/api/crm/contacts/${String(props.profile.id)}`, {
      method: 'PATCH',
      body: {
        name: name.value.trim(),
        email: email.value.trim() === '' ? null : email.value.trim(),
        phone: phone.value.trim() === '' ? null : phone.value.trim(),
        country: country.value.trim() === '' ? null : country.value.trim().toUpperCase(),
        language: language.value.trim().toLowerCase(),
        preferred_channel: preferredChannel.value,
        type: type.value
      }
    }) as ContactProfile

    applyProfile(updated)
    toast.add({ title: t('crmContacts.savedToast') })
    emit('updated', updated)
  } catch (error: unknown) {
    if (!applyApiFormError(error, (fields, conflict) => {
      fieldErrors.value = fields
      warn.value = conflict
      conflictId.value = parseEmailConflictContactId(conflict)
    })) {
      warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
    }
  } finally {
    saving.value = false
  }
}

function reviewMerge(): void {
  if (props.profile === null || conflictId.value === null) {
    return
  }

  emit('reviewMerge', props.profile.id, conflictId.value)
}

function bookingHref(reference: string | null): string | null {
  if (reference === null || reference === '') {
    return null
  }

  return `/rms/reservations/bookings?open=${encodeURIComponent(reference)}`
}

function timelineHref(item: TimelineItem): string | null {
  if (item.link === null) {
    return null
  }

  if (item.link.type === 'booking') {
    return bookingHref(item.link.reference)
  }

  return null
}

function onTimelineContact(id: number): void {
  emit('openContact', id)
}

function mergeMatch(item: TimelineItem) {
  return matchMergeForTimeline(item.at, item.link?.id, merges.value)
}

function showUndo(item: TimelineItem): boolean {
  if (!canMerge.value || item.kind !== 'merge') {
    return false
  }

  const match = mergeMatch(item)

  if (match.kind === 'ambiguous') {
    return true
  }

  return match.kind === 'one' && isUndoWindowOpen(match.merge.merged_at)
}

function undoDisabled(item: TimelineItem): boolean {
  return mergeMatch(item).kind === 'ambiguous'
}

function startUndo(item: TimelineItem): void {
  const match = mergeMatch(item)

  if (match.kind !== 'one') {
    return
  }

  undoTarget.value = match.merge
  undoError.value = ''
  undoOpen.value = true
}

async function onUndo(reason: string): Promise<void> {
  if (undoTarget.value === null) {
    return
  }

  undoSubmitting.value = true
  undoError.value = ''

  try {
    const result = await request(`/api/crm/contact-merges/${String(undoTarget.value.id)}/undo`, {
      method: 'POST',
      body: { reason }
    }) as ContactUnmergeResult

    undoOpen.value = false
    toast.add({ title: t('crmContacts.undoneToast') })

    if (result.skipped_rows.length > 0) {
      toast.add({
        title: t('crmContacts.undoSkipped', {
          rows: result.skipped_rows.map(row => `${row.table}#${String(row.id)}`).join(', ')
        })
      })
    }

    emit('undone')
  } catch (error: unknown) {
    undoError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    undoSubmitting.value = false
  }
}
</script>

<template>
  <USlideover
    :open="open"
    class="history-drawer"
    @update:open="open = $event"
  >
    <template #header>
      <div v-if="profile">
        <h2>{{ profile.name }}</h2>
        <div class="bid">
          {{ filterLabel(typeOptions, profile.type) }}
          ·
          {{ filterLabel(lifecycleOptions, profile.lifecycle) }}
          ·
          {{ t('crmContacts.contactId', { id: String(profile.id) }) }}
        </div>
      </div>
    </template>

    <template #body>
      <template v-if="profile">
        <div
          v-if="profile.resolved_from_alias"
          class="crm-banner"
        >
          {{ t('crmContacts.mergedInto', { name: profile.name }) }}
        </div>

        <div class="kv">
          <span>{{ t('crmContacts.countryLanguage') }}</span>
          <span>
            {{ profile.country ?? '—' }} · {{ profile.language }}
            <span class="ro">{{ t('crmContacts.allSendsEnglish') }}</span>
          </span>
        </div>
        <div class="kv">
          <span>{{ t('crmContacts.preferredChannel') }}</span>
          <span>{{ channelLabel(profile.preferred_channel) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmContacts.mainChannel') }}</span>
          <span>{{ profile.main_channel ?? '—' }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmContacts.channelOfOrigin') }}</span>
          <span>{{ profile.channel_of_origin ?? '—' }}</span>
        </div>
        <div class="kv">
          <span>
            {{ t('crmContacts.ltv') }}
            <span class="ro">{{ t('crmContacts.fromRmsLedger') }}</span>
          </span>
          <span>
            {{ profile.lifetime_value === 0 ? '—' : money(profile.lifetime_value) }}
            ·
            <span
              class="pill"
              :class="segmentPillClass(profile.segment)"
            >{{ profile.segment }}</span>
          </span>
        </div>
        <div class="kv">
          <span>{{ t('crmContacts.firstTouch') }}</span>
          <span>{{ formatAttribution(profile.first_touch) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmContacts.lastTouch') }}</span>
          <span>{{ formatAttribution(profile.last_touch) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('crmContacts.npsLabel') }}</span>
          <span>{{ t('crmContacts.nps') }}</span>
        </div>
        <div
          v-if="partner"
          class="kv"
        >
          <span>{{ t('crmContacts.partnerRecord') }}</span>
          <span>
            <NuxtLink :to="`/rms/commercial/b2b?open=${String(partner.id)}`">
              {{ partner.reference }} · {{ partner.name }}
            </NuxtLink>
            <span class="ro">{{ t('crmContacts.partnerRms') }}</span>
          </span>
        </div>

        <div class="sec">
          <h4>
            {{ t('crmContacts.consentTitle') }}
            <span class="ro">{{ t('crmContacts.consentOwned') }}</span>
          </h4>
          <div class="kv">
            <span>{{ t('crmContacts.consentTransactionalLabel') }}</span>
            <span class="pill ok">{{ t('crmContacts.consentAlwaysOn') }}</span>
          </div>
          <div class="kv">
            <span>{{ t('crmContacts.consentMarketingLabel') }}</span>
            <span
              class="pill"
              :class="profile.consent.marketing ? 'ok' : 'new'"
            >{{ profile.consent.marketing ? t('crmContacts.consentOptedIn') : t('crmContacts.consentNotOptedIn') }}</span>
          </div>
          <p class="crm-held">
            {{ t('crmContacts.consentRegister') }}
          </p>
        </div>

        <div class="sec">
          <h4>
            {{ t('crmContacts.bookingsTitle') }}
            <span class="ro">{{ t('crmContacts.bookingsRms') }}</span>
          </h4>
          <table
            v-if="profile.bookings.length > 0"
            class="list"
          >
            <tbody>
              <tr
                v-for="row in profile.bookings"
                :key="row.id"
              >
                <td class="bk-ref">
                  <NuxtLink
                    v-if="bookingHref(row.display_reference)"
                    :to="bookingHref(row.display_reference) ?? ''"
                  >
                    {{ row.display_reference }}
                  </NuxtLink>
                  <template v-else>
                    —
                  </template>
                </td>
                <td>
                  <span class="pill">{{ statusLabel(row.status) }}</span>
                </td>
                <td>{{ format(row.departure_date, 'short') }}</td>
                <td>{{ money(row.charges_total) }}</td>
              </tr>
            </tbody>
          </table>
          <p
            v-else
            class="crm-held"
          >
            {{ t('crmContacts.bookingsEmpty') }}
          </p>
        </div>

        <div class="sec">
          <h4>{{ t('crmContacts.timelineTitle') }}</h4>
          <div
            v-if="items.length > 0"
            class="crm-tl"
          >
            <div
              v-for="item in items"
              :key="`${item.kind}-${item.at}-${item.title}`"
              class="crm-ev"
            >
              <span class="t">{{ format(item.at, 'dateTime') }} · {{ item.kind }}</span>
              <div class="crm-ev-title">
                <NuxtLink
                  v-if="timelineHref(item)"
                  :to="timelineHref(item) ?? ''"
                >
                  {{ item.title }}
                </NuxtLink>
                <button
                  v-else-if="item.link?.type === 'contact'"
                  type="button"
                  class="lnk"
                  @click="onTimelineContact(item.link.id)"
                >
                  {{ item.title }}
                </button>
                <template v-else>
                  {{ item.title }}
                </template>
              </div>
              <div
                v-if="item.detail !== ''"
                class="crm-held"
              >
                {{ item.detail }}
              </div>
              <div
                v-if="showUndo(item)"
                class="row-actions"
              >
                <UButton
                  variant="outline"
                  :disabled="undoDisabled(item)"
                  @click="startUndo(item)"
                >
                  {{ t('crmContacts.undo') }}
                </UButton>
                <span
                  v-if="undoDisabled(item)"
                  class="crm-held"
                >{{ t('crmContacts.undoAmbiguous') }}</span>
              </div>
            </div>
          </div>
          <p
            v-else
            class="crm-held"
          >
            {{ t('crmContacts.timelineEmpty') }}
          </p>
          <div
            v-if="timelineMeta && timelineMeta.last_page > 1"
            class="list-pager"
          >
            <button
              type="button"
              :disabled="timelineMeta.current_page <= 1"
              @click="timelinePage -= 1"
            >
              {{ t('bookings.previous') }}
            </button>
            <span>{{ t('bookings.pager', { from: String(timelineMeta.from ?? 0), to: String(timelineMeta.to ?? 0), total: String(timelineMeta.total) }) }}</span>
            <button
              type="button"
              :disabled="timelineMeta.current_page >= timelineMeta.last_page"
              @click="timelinePage += 1"
            >
              {{ t('bookings.next') }}
            </button>
          </div>
        </div>

        <div class="sec">
          <h4>{{ t('crmContacts.notHeldTitle') }}</h4>
          <p class="crm-held">
            {{ t('crmContacts.notHeld') }}
          </p>
        </div>

        <div
          v-if="canManage"
          class="sec"
        >
          <h4>{{ t('crmContacts.editTitle') }}</h4>
          <div
            v-if="warn"
            class="warnbox"
          >
            <span>{{ warn }}</span>
            <UButton
              v-if="conflictId !== null && canMerge"
              variant="outline"
              @click="reviewMerge"
            >
              {{ t('crmContacts.reviewMerge') }}
            </UButton>
          </div>
          <div class="field">
            <label for="crm-name">{{ t('crmContacts.name') }}</label>
            <input
              id="crm-name"
              v-model="name"
            >
            <p
              v-if="fieldErrors.name"
              class="field-hint"
            >
              {{ fieldErrors.name }}
            </p>
          </div>
          <div class="field">
            <label for="crm-email">{{ t('crmContacts.email') }}</label>
            <input
              id="crm-email"
              v-model="email"
            >
            <p
              v-if="fieldErrors.email"
              class="field-hint"
            >
              {{ fieldErrors.email }}
            </p>
          </div>
          <div class="field">
            <label for="crm-phone">{{ t('crmContacts.phone') }}</label>
            <input
              id="crm-phone"
              v-model="phone"
            >
            <p
              v-if="fieldErrors.phone"
              class="field-hint"
            >
              {{ fieldErrors.phone }}
            </p>
          </div>
          <div class="field">
            <label for="crm-country">{{ t('crmContacts.country') }}</label>
            <input
              id="crm-country"
              v-model="country"
              maxlength="2"
            >
            <p
              v-if="fieldErrors.country"
              class="field-hint"
            >
              {{ fieldErrors.country }}
            </p>
          </div>
          <div class="field">
            <label for="crm-language">{{ t('crmContacts.language') }}</label>
            <input
              id="crm-language"
              v-model="language"
              maxlength="2"
            >
            <p
              v-if="fieldErrors.language"
              class="field-hint"
            >
              {{ fieldErrors.language }}
            </p>
          </div>
          <div class="field">
            <label for="crm-channel">{{ t('crmContacts.preferredChannel') }}</label>
            <select
              id="crm-channel"
              v-model="preferredChannel"
            >
              <option
                v-for="channel in CHANNELS"
                :key="channel"
                :value="channel"
              >
                {{ channelLabel(channel) }}
              </option>
            </select>
          </div>
          <div class="field">
            <label for="crm-type">{{ t('crmContacts.type') }}</label>
            <select
              id="crm-type"
              v-model="type"
            >
              <option
                v-for="option in typeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
          <UButton
            :loading="saving"
            :disabled="saving"
            @click="save"
          >
            {{ t('crmContacts.save') }}
          </UButton>
        </div>
      </template>
    </template>
  </USlideover>

  <ReasonModal
    v-model:open="undoOpen"
    :title="t('crmContacts.undoTitle')"
    hint="required"
    :submitting="undoSubmitting"
    :error="undoError"
    @submit="onUndo"
  >
    <template #extra>
      <p class="crm-held">
        {{ t('crmContacts.undoHint') }}
      </p>
    </template>
  </ReasonModal>
</template>
