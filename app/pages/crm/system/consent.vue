<script setup lang="ts">
import type {
  ConsentRegisterRow,
  DataMapRow,
  SubjectRequest,
  SubjectRequestStatus,
  SubjectRequestType
} from '../../../types/api'
import NewSubjectRequestModal from '../../../components/crm/NewSubjectRequestModal.vue'
import SubjectRequestDrawer from '../../../components/crm/SubjectRequestDrawer.vue'
import { subjectRequestDueClass } from '../../../components/crm/privacyHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

const TYPES: Array<SubjectRequestType | ''> = ['', 'ACCESS', 'ERASURE', 'RECTIFICATION', 'OBJECTION']
const STATUSES: Array<SubjectRequestStatus | ''> = ['', 'OPEN', 'COMPLETED', 'REJECTED']

const { t } = useI18n()
const { request } = useApi()
const { format } = useDates()
const { can } = useAuth()

const register = ref<Array<ConsentRegisterRow>>([])
const dataMap = ref<Array<DataMapRow>>([])
const requests = ref<Array<SubjectRequest>>([])
const loadError = ref('')
const typeFilter = ref<SubjectRequestType | ''>('')
const statusFilter = ref<SubjectRequestStatus | ''>('')
const overdueOnly = ref(false)
const newOpen = ref(false)
const drawerOpen = ref(false)
const drawerId = ref<number | null>(null)

const canManagePrivacy = computed(() => can('privacy.manage'))

const typeItems = computed(() => [
  { label: t('crmPrivacy.typeAll'), value: '' as const },
  ...TYPES.filter((value): value is SubjectRequestType => value !== '').map(item => ({
    label: t(`crmPrivacy.types.${item}`),
    value: item
  }))
])

const statusItems = computed(() => [
  { label: t('crmPrivacy.statusAll'), value: '' as const },
  ...STATUSES.filter((value): value is SubjectRequestStatus => value !== '').map(item => ({
    label: item,
    value: item
  }))
])

onMounted(() => {
  void loadRegister()
  if (canManagePrivacy.value) {
    void loadRequests()
  }
})

watch([typeFilter, statusFilter, overdueOnly], () => {
  if (canManagePrivacy.value) {
    void loadRequests()
  }
})

async function loadRegister(): Promise<void> {
  try {
    const [rows, map] = await Promise.all([
      request('/api/crm/consents/register') as Promise<{ data: Array<ConsentRegisterRow> }>,
      request('/api/crm/consents/data-map') as Promise<{ data: Array<DataMapRow> }>
    ])
    register.value = rows.data
    dataMap.value = map.data
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmPrivacy.requestFailed')
  }
}

async function loadRequests(): Promise<void> {
  const params = new URLSearchParams()

  if (typeFilter.value !== '') {
    params.set('type', typeFilter.value)
  }

  if (statusFilter.value !== '') {
    params.set('status', statusFilter.value)
  }

  if (overdueOnly.value) {
    params.set('overdue', '1')
  }

  const query = params.toString()
  const payload = await request(query === '' ? '/api/privacy/requests' : `/api/privacy/requests?${query}`) as { data: Array<SubjectRequest> }
  requests.value = payload.data
}

function openRequest(id: number): void {
  drawerId.value = id
  drawerOpen.value = true
}

function storedClass(storedIn: string): string {
  if (storedIn === 'CRM') {
    return 'sys-crm'
  }

  if (storedIn === 'RMS') {
    return 'sys-rms'
  }

  if (storedIn === 'Stripe') {
    return 'sys-ext'
  }

  return ''
}

function inCrmLabel(value: string): string {
  if (value === 'yes' || value === 'no' || value === 'reference' || value === 'not_built' || value === 'never') {
    return t(`crmPrivacy.inCrmValues.${value}`)
  }

  return value
}
</script>

<template>
  <div>
    <p class="notice crm-notice">
      {{ t('crmPrivacy.notice') }}
    </p>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>

    <div class="crm-grid2">
      <div class="panel">
        <div class="bk-toolbar">
          <h3>{{ t('crmPrivacy.register') }}</h3>
        </div>
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmPrivacy.purpose') }}</th>
              <th>{{ t('crmPrivacy.basis') }}</th>
              <th>{{ t('crmPrivacy.optIn') }}</th>
              <th>{{ t('crmPrivacy.capturedAt') }}</th>
              <th>{{ t('crmPrivacy.contacts') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in register"
              :key="row.purpose"
            >
              <td>{{ row.label }}</td>
              <td class="nw">
                {{ row.basis }}
              </td>
              <td class="nw">
                {{ row.opt_in_needed ? t('crmPrivacy.yes') : t('crmPrivacy.no') }}
              </td>
              <td>{{ row.where_captured }}</td>
              <td class="nw">
                {{ row.contacts }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel">
        <div class="bk-toolbar">
          <h3>{{ t('crmPrivacy.dataMap') }}</h3>
        </div>
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmPrivacy.data') }}</th>
              <th>{{ t('crmPrivacy.storedIn') }}</th>
              <th>{{ t('crmPrivacy.inCrm') }}</th>
              <th>{{ t('crmPrivacy.retention') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in dataMap"
              :key="row.data"
            >
              <td>{{ row.data }}</td>
              <td class="nw">
                <span
                  class="sysbadge"
                  :class="storedClass(row.stored_in)"
                >{{ row.stored_in }}</span>
              </td>
              <td class="nw">
                <span
                  v-if="row.in_crm === 'never'"
                  class="pill bad"
                >{{ t('crmPrivacy.inCrmValues.never') }}</span>
                <template v-else>
                  {{ inCrmLabel(row.in_crm) }}
                </template>
              </td>
              <td>
                {{ row.retention }}
                <span
                  v-if="row.rule_key"
                  class="crm-held"
                >{{ row.rule_key }}<template v-if="row.rule_value !== null"> · {{ row.rule_value }}</template></span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <div class="bk-toolbar">
        <h3>{{ t('crmPrivacy.requests') }}</h3>
        <UButton
          v-if="canManagePrivacy"
          @click="newOpen = true"
        >
          {{ t('crmPrivacy.newRequest') }}
        </UButton>
      </div>

      <p
        v-if="!canManagePrivacy"
        class="crm-held"
      >
        {{ t('crmPrivacy.requestsAdmin') }}
      </p>

      <template v-else>
        <div class="ebtool dep-toolbar">
          <USelect
            v-model="typeFilter"
            size="sm"
            :items="typeItems"
          />
          <USelect
            v-model="statusFilter"
            size="sm"
            :items="statusItems"
          />
          <label class="crm-check">
            <input
              v-model="overdueOnly"
              type="checkbox"
            >
            {{ t('crmPrivacy.overdueOnly') }}
          </label>
        </div>
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmPrivacy.type') }}</th>
              <th>{{ t('crmPipeline.contact') }}</th>
              <th>{{ t('crmPrivacy.received') }}</th>
              <th>{{ t('crmPrivacy.due') }}</th>
              <th>{{ t('crmPrivacy.status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="requests.length === 0">
              <td colspan="5">
                {{ t('crmPrivacy.requestsEmpty') }}
              </td>
            </tr>
            <tr
              v-for="item in requests"
              :key="item.id"
            >
              <td>
                <button
                  type="button"
                  class="lnk"
                  @click="openRequest(item.id)"
                >
                  {{ t(`crmPrivacy.types.${item.type}`) }}
                </button>
              </td>
              <td>
                <NuxtLink :to="`/crm/sales/contacts?open=${String(item.contact_id)}`">
                  {{ t('crmContacts.contactId', { id: String(item.contact_id) }) }}
                </NuxtLink>
              </td>
              <td class="nw">
                {{ format(item.received_at, 'dateTime') }}
              </td>
              <td
                class="nw"
                :class="subjectRequestDueClass(item.due_at, item.status)"
              >
                {{ format(item.due_at, 'dateTime') }}
              </td>
              <td>{{ item.status }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <p class="crm-hint">
        {{ t('crmPrivacy.pending') }}
      </p>
    </div>

    <NewSubjectRequestModal
      v-if="canManagePrivacy"
      v-model:open="newOpen"
      @created="loadRequests"
    />
    <SubjectRequestDrawer
      v-if="canManagePrivacy"
      v-model:open="drawerOpen"
      :request-id="drawerId"
      @changed="loadRequests"
    />
  </div>
</template>
