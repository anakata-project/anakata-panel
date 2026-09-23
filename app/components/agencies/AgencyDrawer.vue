<script setup lang="ts">
import type { Agency, AgencyUser, AgencyUserUpdate, BookingStatus, CommissionPayoutInput, CommissionStatus, Paginated, PortalActivity, PortalPreview, SalesMaterial, SalesMaterialKind } from '../../types/api'
import { firstApiMessage } from '../../utils/apiForm'
import { downloadDocumentFile } from '../documents/documentFetch'
import { agencyStatusPill, commissionStatusClass, countryName, materialKindKey, materialSizeLabel, portalActivityKey, portalUserActions, SALES_MATERIAL_KINDS } from './agencyHelpers'
import { statusLabel, statusPillClass } from '../bookings/bookingHelpers'
import ReasonModal from '../bookings/ReasonModal.vue'
import CommissionPayoutModal from './CommissionPayoutModal.vue'

type AgencyBooking = Agency['bookings'][number]

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  agency: Agency | null
  capPct: number
}>()

const emit = defineEmits<{
  saved: [agency: Agency]
  openBooking: [id: number]
}>()

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const { format: money } = useMoney()
const toast = useToast()

const name = ref('')
const contact = ref('')
const network = ref('')
const terms = ref('')
const commission = ref(0)
const snapshot = ref('')
const warn = ref('')
const saving = ref(false)
const preview = ref<PortalPreview | null>(null)
const userName = ref('')
const userEmail = ref('')
const userBusy = ref(false)
const payoutOpen = ref(false)
const payoutTarget = ref<AgencyBooking | null>(null)
const payoutSubmitting = ref(false)
const payoutError = ref('')
const materials = ref<Array<SalesMaterial>>([])
const materialTitle = ref('')
const materialKind = ref<SalesMaterialKind>('FACT_SHEET')
const materialFile = ref<File | null>(null)
const materialFileInput = ref<HTMLInputElement | null>(null)
const materialBusy = ref(false)
const activity = ref<Paginated<PortalActivity> | null>(null)
const activityPage = ref(1)
const accessOpen = ref(false)
const accessMode = ref<'suspend' | 'resume'>('suspend')
const accessBusy = ref(false)
const accessError = ref('')
let previewToken = 0
let materialsToken = 0
let activityToken = 0

const userNameId = useId()
const userEmailId = useId()
const materialTitleId = useId()
const materialKindId = useId()
const materialFileId = useId()

const canManage = computed(() => can('agencies.manage'))
const canRecordPayout = computed(() => can('commissions.record_payout'))

const dirty = computed(() => {
  return `${name.value}\0${contact.value}\0${network.value}\0${terms.value}\0${String(commission.value)}` !== snapshot.value
})

const canAddUser = computed(() => userName.value.trim() !== '' && userEmail.value.trim() !== '' && !userBusy.value)
const canUploadMaterial = computed(() => materialTitle.value.trim() !== '' && materialFile.value !== null && !materialBusy.value)

watch(
  () => [open.value, props.agency] as const,
  ([isOpen, agency]) => {
    if (!isOpen || agency === null) {
      return
    }

    name.value = agency.name
    contact.value = agency.contact
    network.value = agency.network ?? ''
    terms.value = agency.payment_terms
    commission.value = agency.commission_pct
    snapshot.value = `${agency.name}\0${agency.contact}\0${agency.network ?? ''}\0${agency.payment_terms}\0${String(agency.commission_pct)}`
    warn.value = ''
  }
)

watch(
  () => [open.value, props.agency, canManage.value] as const,
  ([isOpen, agency, manage]) => {
    void loadPreview(isOpen, agency, manage)
  }
)

watch(
  () => [open.value, props.agency?.id, canManage.value] as const,
  ([isOpen, agencyId, manage]) => {
    if (!isOpen || agencyId === undefined || !manage) {
      materials.value = []
      activity.value = null
      return
    }

    void loadMaterials(agencyId)

    if (activityPage.value !== 1) {
      activityPage.value = 1
      return
    }

    void loadActivity(agencyId, 1)
  }
)

watch(activityPage, (page) => {
  const agencyId = props.agency?.id

  if (!open.value || agencyId === undefined || !canManage.value) {
    return
  }

  void loadActivity(agencyId, page)
})

async function loadPreview(isOpen: boolean, agency: Agency | null, manage: boolean): Promise<void> {
  const token = ++previewToken

  if (!isOpen || agency === null || !manage) {
    preview.value = null
    return
  }

  try {
    const body = await request(`/api/rms/agencies/${String(agency.id)}/portal-preview`) as PortalPreview

    if (token === previewToken) {
      preview.value = body
    }
  } catch (error: unknown) {
    if (token !== previewToken) {
      return
    }

    preview.value = null
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  }
}

async function reloadAgency(): Promise<Agency | null> {
  if (props.agency === null) {
    return null
  }

  return await request(`/api/rms/agencies/${String(props.agency.id)}`) as Agency
}

async function loadMaterials(agencyId: number): Promise<void> {
  const token = ++materialsToken

  try {
    const body = await request(`/api/rms/sales-materials?agency_id=${String(agencyId)}`) as { data: Array<SalesMaterial> }

    if (token === materialsToken) {
      materials.value = body.data
    }
  } catch (error: unknown) {
    if (token !== materialsToken) {
      return
    }

    materials.value = []
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  }
}

async function loadActivity(agencyId: number, page: number): Promise<void> {
  const token = ++activityToken

  try {
    const body = await request(`/api/rms/agencies/${String(agencyId)}/portal-activity?page=${String(page)}`) as Paginated<PortalActivity>

    if (token === activityToken) {
      activity.value = body
    }
  } catch (error: unknown) {
    if (token !== activityToken) {
      return
    }

    activity.value = null
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  }
}

function onMaterialFile(event: Event): void {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  materialFile.value = target.files?.[0] ?? null
}

async function uploadMaterial(): Promise<void> {
  if (props.agency === null || !canUploadMaterial.value || materialFile.value === null) {
    return
  }

  materialBusy.value = true
  warn.value = ''

  const body = new FormData()
  body.append('title', materialTitle.value.trim())
  body.append('kind', materialKind.value)
  body.append('agency_id', String(props.agency.id))
  body.append('file', materialFile.value)

  try {
    await request('/api/rms/sales-materials', {
      method: 'POST',
      body
    })
    materialTitle.value = ''
    materialKind.value = 'FACT_SHEET'
    materialFile.value = null

    if (materialFileInput.value !== null) {
      materialFileInput.value.value = ''
    }
    toast.add({ title: t('agencies.uploadedToast') })
    await loadMaterials(props.agency.id)
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    materialBusy.value = false
  }
}

async function toggleMaterial(material: SalesMaterial): Promise<void> {
  if (props.agency === null || materialBusy.value) {
    return
  }

  materialBusy.value = true
  warn.value = ''

  try {
    await request(`/api/rms/sales-materials/${String(material.id)}`, {
      method: 'PATCH'
    })
    toast.add({ title: t('agencies.publishedToast') })
    await loadMaterials(props.agency.id)
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    materialBusy.value = false
  }
}

async function downloadMaterial(material: SalesMaterial): Promise<void> {
  warn.value = ''

  try {
    await downloadDocumentFile(`/api/rms/sales-materials/${String(material.id)}/file`, material.title)
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  }
}

function startAccess(mode: 'suspend' | 'resume'): void {
  accessMode.value = mode
  accessError.value = ''
  accessOpen.value = true
}

async function onAccess(reason: string): Promise<void> {
  if (props.agency === null) {
    return
  }

  accessBusy.value = true
  accessError.value = ''

  const path = accessMode.value === 'suspend' ? 'suspend' : 'resume'

  try {
    await request(`/api/rms/agencies/${String(props.agency.id)}/portal/${path}`, {
      method: 'POST',
      body: { reason }
    })
    const updated = await reloadAgency()
    accessOpen.value = false
    toast.add({
      title: t(accessMode.value === 'suspend' ? 'agencies.suspendedToast' : 'agencies.resumedToast')
    })

    if (updated !== null) {
      emit('saved', updated)
    }
  } catch (error: unknown) {
    accessError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    accessBusy.value = false
  }
}

function activityText(event: string): string {
  const key = portalActivityKey(event)

  return key === null ? event : t(key)
}

function bookingIdFor(reference: string): number | null {
  const row = props.agency?.bookings.find(booking => booking.reference === reference)

  return row === undefined ? null : row.id
}

function openActivityBooking(reference: string): void {
  const id = bookingIdFor(reference)

  if (id !== null) {
    emit('openBooking', id)
  }
}

function userActions(user: AgencyUser) {
  return portalUserActions(user)
}

function userStateKey(state: ReturnType<typeof portalUserActions>['state']): string {
  if (state === 'active') {
    return 'agencies.userActive'
  }

  if (state === 'disabled') {
    return 'agencies.userDisabled'
  }

  if (state === 'invited') {
    return 'agencies.userInvited'
  }

  return 'agencies.userPending'
}

async function save(): Promise<void> {
  if (props.agency === null) {
    return
  }

  saving.value = true
  warn.value = ''

  try {
    const updated = await request(`/api/rms/agencies/${String(props.agency.id)}`, {
      method: 'PATCH',
      body: {
        name: name.value.trim(),
        contact: contact.value.trim(),
        network: network.value.trim(),
        payment_terms: terms.value.trim(),
        commission_pct: commission.value
      }
    }) as Agency

    snapshot.value = `${updated.name}\0${updated.contact}\0${updated.network ?? ''}\0${updated.payment_terms}\0${String(updated.commission_pct)}`
    toast.add({ title: t('agencies.savedToast') })
    emit('saved', updated)
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    saving.value = false
  }
}

async function addUser(): Promise<void> {
  if (props.agency === null || !canAddUser.value) {
    return
  }

  userBusy.value = true
  warn.value = ''

  try {
    const updated = await request(`/api/rms/agencies/${String(props.agency.id)}/users`, {
      method: 'POST',
      body: {
        name: userName.value.trim(),
        email: userEmail.value.trim()
      }
    }) as Agency

    userName.value = ''
    userEmail.value = ''
    toast.add({ title: t('agencies.userAddedToast') })
    emit('saved', updated)
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    userBusy.value = false
  }
}

async function inviteUser(userId: number): Promise<void> {
  if (props.agency === null || userBusy.value) {
    return
  }

  userBusy.value = true
  warn.value = ''

  try {
    await request(`/api/rms/agencies/${String(props.agency.id)}/users/${String(userId)}/invite`, {
      method: 'POST'
    })
    const updated = await reloadAgency()
    toast.add({ title: t('agencies.invitedToast') })

    if (updated !== null) {
      emit('saved', updated)
    }
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    userBusy.value = false
  }
}

async function setUserStatus(userId: number, status: AgencyUserUpdate['status']): Promise<void> {
  if (props.agency === null || status === undefined || userBusy.value) {
    return
  }

  userBusy.value = true
  warn.value = ''

  try {
    await request(`/api/rms/agencies/${String(props.agency.id)}/users/${String(userId)}`, {
      method: 'PATCH',
      body: { status }
    })
    const updated = await reloadAgency()

    toast.add({ title: t('agencies.userUpdatedToast') })

    if (updated !== null) {
      emit('saved', updated)
    }
  } catch (error: unknown) {
    warn.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    userBusy.value = false
  }
}

function knownCommissionStatus(value: string): CommissionStatus | null {
  if (
    value === 'BLOCKED'
    || value === 'EARNED_ON_COMPLETION'
    || value === 'PAYABLE'
    || value === 'PAID'
    || value === 'CANCELLED'
  ) {
    return value
  }

  return null
}

function commissionPill(value: string): { label: string, className: string } | null {
  const status = knownCommissionStatus(value)

  if (status === null) {
    return null
  }

  return {
    label: commissionLabel(status),
    className: commissionStatusClass(status)
  }
}

function commissionLabel(status: CommissionStatus): string {
  if (status === 'BLOCKED') {
    return t('payments.commissionBlocked')
  }

  if (status === 'EARNED_ON_COMPLETION') {
    return t('payments.commissionAccrued')
  }

  if (status === 'PAYABLE') {
    return t('payments.commissionPayable')
  }

  if (status === 'PAID') {
    return t('payments.commissionPaid')
  }

  return t('payments.commissionCancelled')
}

function materialsLine(source: PortalPreview): string {
  const items = source.sales_materials.items.join(' · ')
  const note = source.sales_materials.note

  if (items === '') {
    return note
  }

  if (note === '') {
    return items
  }

  return `${items} — ${note}`
}

function startPayout(row: AgencyBooking): void {
  payoutTarget.value = row
  payoutError.value = ''
  payoutOpen.value = true
}

async function onPayout(payload: { paid_on: string, bank_reference: string }): Promise<void> {
  if (props.agency === null || payoutTarget.value === null) {
    return
  }

  payoutSubmitting.value = true
  payoutError.value = ''

  const body: CommissionPayoutInput = {
    amount: payoutTarget.value.commission_amount,
    paid_on: payload.paid_on,
    bank_reference: payload.bank_reference
  }

  try {
    await request(`/api/rms/commissions/${String(payoutTarget.value.id)}/payout`, {
      method: 'POST',
      body
    })
    const updated = await request(`/api/rms/agencies/${String(props.agency.id)}`) as Agency
    payoutOpen.value = false
    toast.add({ title: t('agencies.payoutToast') })
    emit('saved', updated)
  } catch (error: unknown) {
    payoutError.value = firstApiMessage(error) ?? (error instanceof Error ? error.message : '')
  } finally {
    payoutSubmitting.value = false
  }
}

function decidedLabel(agency: Agency): string {
  if (agency.decided_at === null) {
    return '—'
  }

  const when = format(agency.decided_at, 'short')
  const who = agency.decided_by?.name ?? ''

  return who === '' ? when : `${when} · ${who}`
}
</script>

<template>
  <USlideover
    :open="open"
    class="history-drawer"
    @update:open="open = $event"
  >
    <template #header>
      <div v-if="agency">
        <h2>{{ agency.name }}</h2>
        <div class="bid">
          {{ agency.reference }}
          ·
          {{ agency.network ?? '—' }}
          ·
          <span
            class="pill"
            :class="agencyStatusPill(agency.status)"
          >{{ agency.status }}</span>
        </div>
      </div>
    </template>

    <template #body>
      <template v-if="agency">
        <div
          v-if="warn"
          class="warnbox"
        >
          {{ warn }}
        </div>

        <div class="kv">
          <span>{{ t('agencies.contact') }}</span>
          <span>{{ agency.contact }} · {{ agency.email }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.country') }}</span>
          <span>{{ countryName(agency.country) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.commissionPct') }}</span>
          <span>
            {{ agency.commission_pct }}%
            <template v-if="agency.commission_pct > capPct">
              {{ t('agencies.capHold', { cap: String(capPct) }) }}
            </template>
          </span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.paymentTerms') }}</span>
          <span>{{ agency.payment_terms }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.colRequested') }}</span>
          <span>{{ t('agencies.registrationLine', {
            requested: agency.requested_at === null ? '—' : format(agency.requested_at, 'short'),
            decided: decidedLabel(agency)
          }) }}</span>
        </div>
        <div class="kv">
          <span>{{ t('agencies.colRevenue') }}</span>
          <span>{{ money(agency.revenue) }} · {{ agency.bookings_count }} · {{ money(agency.commission_accrued) }}</span>
        </div>

        <div class="sec">
          <h4>{{ t('agencies.usersTitle') }}</h4>
          <div
            v-for="user in agency.users"
            :key="user.id"
            class="kv"
          >
            <span>{{ user.name }} · {{ user.email }}</span>
            <span>
              {{ t(userStateKey(userActions(user).state)) }}
              <template v-if="userActions(user).state === 'active' && user.last_login_at !== null">
                · {{ t('agencies.lastSignIn', { time: format(user.last_login_at, 'dateTime') }) }}
              </template>
              <template v-if="userActions(user).state === 'invited' && user.invite_sent_at !== null">
                · {{ t('agencies.invitedLine', {
                  sent: format(user.invite_sent_at, 'dateTime'),
                  expires: user.invite_expires_at === null ? '—' : format(user.invite_expires_at, 'dateTime')
                }) }}
              </template>
              <UButton
                v-if="canManage && userActions(user).canInvite"
                variant="outline"
                size="xs"
                :disabled="userBusy"
                @click="inviteUser(user.id)"
              >
                {{ t('agencies.inviteUser') }}
              </UButton>
              <UButton
                v-if="canManage && userActions(user).canResend"
                variant="outline"
                size="xs"
                :disabled="userBusy"
                @click="inviteUser(user.id)"
              >
                {{ t('agencies.resendInvite') }}
              </UButton>
              <UButton
                v-if="canManage && userActions(user).canDisable"
                variant="outline"
                size="xs"
                :disabled="userBusy"
                @click="setUserStatus(user.id, 'DISABLED')"
              >
                {{ t('agencies.disableUser') }}
              </UButton>
              <UButton
                v-if="canManage && userActions(user).canEnable"
                variant="outline"
                size="xs"
                :disabled="userBusy"
                @click="setUserStatus(user.id, 'ACTIVE')"
              >
                {{ t('agencies.enableUser') }}
              </UButton>
            </span>
          </div>
          <p class="note">
            {{ t('agencies.invitesLater') }}
          </p>
          <template v-if="canManage">
            <div class="field">
              <label :for="userNameId">{{ t('agencies.name') }}</label>
              <input
                :id="userNameId"
                v-model="userName"
              >
            </div>
            <div class="field">
              <label :for="userEmailId">{{ t('agencies.email') }}</label>
              <input
                :id="userEmailId"
                v-model="userEmail"
                type="email"
              >
            </div>
            <UButton
              variant="outline"
              :disabled="!canAddUser"
              :loading="userBusy"
              @click="addUser"
            >
              {{ t('agencies.addUser') }}
            </UButton>
          </template>
        </div>

        <div class="sec">
          <h4>{{ t('agencies.accessTitle') }}</h4>
          <p class="note">
            {{ t('agencies.accessNote') }}
          </p>
          <div
            v-if="agency.portal_suspended"
            class="kv"
          >
            <span>{{ t('agencies.accessSuspended') }}</span>
            <span>
              {{ agency.portal_suspended_at === null ? '—' : format(agency.portal_suspended_at, 'dateTime') }}
              · {{ agency.portal_suspended_by?.name ?? '—' }}
              · {{ agency.portal_suspend_reason ?? '—' }}
            </span>
          </div>
          <div
            v-else
            class="kv"
          >
            <span>{{ t('agencies.accessOpen') }}</span>
            <span />
          </div>
          <UButton
            v-if="canManage && !agency.portal_suspended"
            variant="outline"
            :disabled="accessBusy"
            @click="startAccess('suspend')"
          >
            {{ t('agencies.suspend') }}
          </UButton>
          <UButton
            v-if="canManage && agency.portal_suspended"
            variant="outline"
            :disabled="accessBusy"
            @click="startAccess('resume')"
          >
            {{ t('agencies.resume') }}
          </UButton>
        </div>

        <div
          v-if="canManage"
          class="sec"
        >
          <h4>{{ t('agencies.materialsTitle') }}</h4>
          <table class="list mini-t">
            <tbody>
              <tr
                v-if="materials.length === 0"
                class="dr-empty"
              >
                <td colspan="2">
                  {{ t('agencies.materialsEmpty') }}
                </td>
              </tr>
              <tr
                v-for="material in materials"
                :key="material.id"
              >
                <td>
                  {{ material.title }}
                  · {{ t(materialKindKey(material.kind)) }}
                  · v{{ material.version }}
                  · {{ materialSizeLabel(material.bytes) }}
                  · {{ material.published ? t('agencies.materialsPublished') : t('agencies.materialsUnpublished') }}
                  <template v-if="material.agency_id === null">
                    · {{ t('agencies.materialsShared') }}
                  </template>
                </td>
                <td class="list-actions">
                  <UButton
                    variant="outline"
                    size="xs"
                    :disabled="materialBusy"
                    @click="toggleMaterial(material)"
                  >
                    {{ material.published ? t('agencies.materialUnpublish') : t('agencies.materialPublish') }}
                  </UButton>
                  <UButton
                    variant="outline"
                    size="xs"
                    @click="downloadMaterial(material)"
                  >
                    {{ t('agencies.materialDownload') }}
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="field">
            <label :for="materialTitleId">{{ t('agencies.materialTitle') }}</label>
            <input
              :id="materialTitleId"
              v-model="materialTitle"
            >
          </div>
          <div class="field">
            <label :for="materialKindId">{{ t('agencies.materialKind') }}</label>
            <select
              :id="materialKindId"
              v-model="materialKind"
            >
              <option
                v-for="kind in SALES_MATERIAL_KINDS"
                :key="kind"
                :value="kind"
              >
                {{ t(materialKindKey(kind)) }}
              </option>
            </select>
          </div>
          <div class="field">
            <label :for="materialFileId">{{ t('agencies.materialFile') }}</label>
            <input
              :id="materialFileId"
              ref="materialFileInput"
              type="file"
              @change="onMaterialFile"
            >
          </div>
          <UButton
            variant="outline"
            :disabled="!canUploadMaterial"
            :loading="materialBusy"
            @click="uploadMaterial"
          >
            {{ t('agencies.materialUpload') }}
          </UButton>
        </div>

        <div
          v-if="canManage"
          class="sec"
        >
          <h4>{{ t('agencies.activityTitle') }}</h4>
          <table class="list mini-t">
            <thead>
              <tr>
                <th>{{ t('agencies.activityWhen') }}</th>
                <th>{{ t('agencies.activityUser') }}</th>
                <th>{{ t('agencies.activityWhat') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="(activity?.data.length ?? 0) === 0"
                class="dr-empty"
              >
                <td colspan="3">
                  {{ t('agencies.activityEmpty') }}
                </td>
              </tr>
              <tr
                v-for="(row, index) in activity?.data ?? []"
                :key="`${row.at}-${row.event}-${String(index)}`"
              >
                <td>{{ format(row.at, 'dateTime') }}</td>
                <td>{{ row.agency_user.name }}</td>
                <td>
                  {{ activityText(row.event) }}
                  <template v-if="row.material">
                    · {{ t('agencies.activityMaterial', {
                      title: row.material.title,
                      version: String(row.material.version)
                    }) }}
                  </template>
                  <template
                    v-for="reference in row.references ?? []"
                    :key="reference"
                  >
                    ·
                    <button
                      v-if="bookingIdFor(reference) !== null"
                      type="button"
                      class="bk-ref"
                      @click="openActivityBooking(reference)"
                    >
                      {{ reference }}
                    </button>
                    <template v-else>
                      {{ reference }}
                    </template>
                  </template>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="activity && activity.meta.last_page > 1"
            class="list-pager"
          >
            <button
              type="button"
              :disabled="activity.meta.current_page <= 1"
              @click="activityPage -= 1"
            >
              {{ t('bookings.previous') }}
            </button>
            <span>{{ t('bookings.pager', {
              from: String(activity.meta.from ?? 0),
              to: String(activity.meta.to ?? 0),
              total: String(activity.meta.total)
            }) }}</span>
            <button
              type="button"
              :disabled="activity.meta.current_page >= activity.meta.last_page"
              @click="activityPage += 1"
            >
              {{ t('bookings.next') }}
            </button>
          </div>
        </div>

        <div class="sec">
          <h4>{{ t('agencies.bookingsTitle') }}</h4>
          <table class="list mini-t">
            <thead>
              <tr>
                <th>{{ t('payments.colBooking') }}</th>
                <th>{{ t('payments.colRate') }}</th>
                <th>{{ t('payments.colCommission') }}</th>
                <th>{{ t('payments.colPayable') }}</th>
                <th>{{ t('payments.colStatus') }}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="agency.bookings.length === 0"
                class="dr-empty"
              >
                <td colspan="6">
                  {{ t('agencies.noBookings') }}
                </td>
              </tr>
              <tr
                v-for="row in agency.bookings"
                :key="row.id"
              >
                <td
                  class="bk-ref"
                  @click="emit('openBooking', row.id)"
                >
                  {{ row.reference }}
                </td>
                <td>{{ row.commission_pct === null ? '—' : `${String(row.commission_pct)}%` }}</td>
                <td>{{ money(row.commission_amount) }}</td>
                <td>{{ format(row.payable_date, 'short') }}</td>
                <td>
                  <span
                    v-if="commissionPill(row.accrual_status)"
                    class="pill"
                    :class="commissionPill(row.accrual_status)?.className"
                  >{{ commissionPill(row.accrual_status)?.label }}</span>
                  <template v-else>
                    {{ row.accrual_status }}
                  </template>
                  <div
                    v-if="row.payout"
                    class="gmeta"
                  >
                    {{ t('agencies.payoutLine', {
                      date: format(row.payout.paid_on, 'short'),
                      reference: row.payout.bank_reference
                    }) }}
                  </div>
                </td>
                <td>
                  <UButton
                    v-if="canRecordPayout && row.accrual_status === 'PAYABLE'"
                    size="xs"
                    @click="startPayout(row)"
                  >
                    {{ t('agencies.recordPayout') }}
                  </UButton>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="canManage"
          class="sec"
        >
          <h4>{{ t('agencies.save') }}</h4>
          <div class="field">
            <label for="ag-name">{{ t('agencies.name') }}</label>
            <input
              id="ag-name"
              v-model="name"
            >
          </div>
          <div class="field">
            <label for="ag-contact">{{ t('agencies.contact') }}</label>
            <input
              id="ag-contact"
              v-model="contact"
            >
          </div>
          <div class="field">
            <label for="ag-network">{{ t('agencies.network') }}</label>
            <input
              id="ag-network"
              v-model="network"
            >
          </div>
          <div class="field">
            <label for="ag-terms">{{ t('agencies.paymentTerms') }}</label>
            <input
              id="ag-terms"
              v-model="terms"
            >
          </div>
          <div class="field">
            <label for="ag-comm">{{ t('agencies.commissionPct') }}</label>
            <input
              id="ag-comm"
              v-model.number="commission"
              type="number"
              min="0"
              max="30"
            >
          </div>
          <UButton
            :disabled="saving || !dirty"
            :loading="saving"
            @click="save"
          >
            {{ t('agencies.save') }}
          </UButton>
        </div>

        <div
          v-if="preview"
          class="sec"
        >
          <h4>{{ t('agencies.previewTitle', { name: agency.name }) }}</h4>
          <p class="notice">
            {{ t('agencies.previewNotice') }}
          </p>
          <div class="prevbox">
            <div class="mono prevl">
              {{ t('agencies.previewRates', { pct: String(preview.commission_pct) }) }}
            </div>
            <table class="list mini-t">
              <thead>
                <tr>
                  <th>{{ t('agencies.netRate') }}</th>
                  <th
                    v-for="year in preview.net_rates"
                    :key="year.year"
                  >
                    {{ year.year }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{{ t('agencies.suitePp') }}</td>
                  <td
                    v-for="year in preview.net_rates"
                    :key="`s-${year.year}`"
                  >
                    {{ money(year.suite_pp) }}
                  </td>
                </tr>
                <tr>
                  <td>{{ t('agencies.ownerPp') }}</td>
                  <td
                    v-for="year in preview.net_rates"
                    :key="`o-${year.year}`"
                  >
                    {{ money(year.owner_pp) }}
                  </td>
                </tr>
                <tr>
                  <td>{{ t('agencies.charterWeek') }}</td>
                  <td
                    v-for="year in preview.net_rates"
                    :key="`c-${year.year}`"
                  >
                    {{ money(year.charter_week) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="mono prevl">
              {{ t('agencies.previewBookings') }}
            </div>
            <table class="list mini-t">
              <thead>
                <tr>
                  <th>{{ t('payments.colBooking') }}</th>
                  <th>{{ t('payments.colClient') }}</th>
                  <th>{{ t('payments.colDate') }}</th>
                  <th>{{ t('payments.colStatus') }}</th>
                  <th>{{ t('agencies.colNetDue') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="preview.bookings.length === 0"
                  class="dr-empty"
                >
                  <td colspan="5">
                    {{ t('agencies.noBookings') }}
                  </td>
                </tr>
                <tr
                  v-for="row in preview.bookings"
                  :key="`p-${row.reference ?? row.lead_guest}`"
                >
                  <td class="bk-ref">
                    {{ row.reference }}
                  </td>
                  <td>{{ row.lead_guest }}</td>
                  <td>{{ format(row.departure_date, 'short') }}</td>
                  <td>
                    <span
                      class="pill"
                      :class="statusPillClass(row.status as BookingStatus)"
                    >{{ statusLabel(row.status) }}</span>
                  </td>
                  <td>{{ money(row.net_due) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="mono prevl">
              {{ t('agencies.previewCommissions') }}
            </div>
            <table class="list mini-t">
              <thead>
                <tr>
                  <th>{{ t('payments.colBooking') }}</th>
                  <th>{{ t('payments.colRate') }}</th>
                  <th>{{ t('payments.colCommission') }}</th>
                  <th>{{ t('payments.colPayable') }}</th>
                  <th>{{ t('payments.colStatus') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-if="preview.commissions.length === 0"
                  class="dr-empty"
                >
                  <td colspan="5">
                    {{ t('agencies.noBookings') }}
                  </td>
                </tr>
                <tr
                  v-for="row in preview.commissions"
                  :key="`c-${row.reference ?? row.payable_date}`"
                >
                  <td class="bk-ref">
                    {{ row.reference }}
                  </td>
                  <td>{{ row.rate === null ? '—' : `${String(row.rate)}%` }}</td>
                  <td>{{ money(row.commission_amount) }}</td>
                  <td>{{ format(row.payable_date, 'short') }}</td>
                  <td>
                    <span
                      class="pill"
                      :class="commissionStatusClass(row.status)"
                    >{{ commissionLabel(row.status) }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
            <div class="mono prevl">
              {{ t('agencies.previewMaterials') }}
            </div>
            <div class="gmeta">
              {{ materialsLine(preview) }}
            </div>
          </div>
        </div>

        <ReasonModal
          v-model:open="accessOpen"
          :title="t(accessMode === 'suspend' ? 'agencies.suspendTitle' : 'agencies.resumeTitle')"
          hint="required"
          :submitting="accessBusy"
          :error="accessError"
          @submit="onAccess"
        />

        <CommissionPayoutModal
          v-model:open="payoutOpen"
          :amount="payoutTarget?.commission_amount ?? 0"
          :submitting="payoutSubmitting"
          :error="payoutError"
          @submit="onPayout"
        />
      </template>
    </template>
  </USlideover>
</template>
