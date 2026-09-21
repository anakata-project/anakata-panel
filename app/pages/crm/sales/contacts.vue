<script setup lang="ts">
import { ApiError } from '#imports'
import type {
  BookingFormOptions,
  ContactDuplicate,
  ContactFilters,
  ContactMergeResult,
  ContactProfile,
  CrmContact,
  Paginated
} from '../../../types/api'
import ContactDrawer from '../../../components/crm/ContactDrawer.vue'
import MergeContactsModal from '../../../components/crm/MergeContactsModal.vue'
import {
  consentPillLabel,
  duplicateReasonLabel,
  filterLabel,
  lifecyclePillClass,
  segmentPillClass
} from '../../../components/crm/contactHelpers'

const SEARCH_DEBOUNCE_MS = 300

type ContactsPayload = Paginated<CrmContact> & {
  meta: Paginated<CrmContact>['meta'] & {
    filters: ContactFilters
  }
}

const { can } = useAuth()
const { t } = useI18n()
const { useFetch, request } = useApi()
const { format: money } = useMoney()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const typeFilter = ref('')
const lifecycleFilter = ref('')
const mainFilter = ref('')
const originFilter = ref('')
const consentFilter = ref('')
const searchInput = ref('')
const search = ref('')
const page = ref(1)

const drawerOpen = ref(false)
const selected = ref<ContactProfile | null>(null)
const mergeOpen = ref(false)
const mergeLeft = ref<number | null>(null)
const mergeRight = ref<number | null>(null)
const duplicates = ref<Array<ContactDuplicate>>([])
const formOptions = ref<BookingFormOptions | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    search.value = value.trim()
  }, SEARCH_DEBOUNCE_MS)
})

onUnmounted(() => {
  clearTimeout(searchTimer)
})

watch([search, typeFilter, lifecycleFilter, mainFilter, originFilter, consentFilter], () => {
  page.value = 1
})

const canMerge = computed(() => can('contacts.merge'))
const canCreateBooking = computed(() => can('bookings.create'))

const listUrl = computed(() => {
  const params = new URLSearchParams({
    page: String(page.value),
    per_page: '50'
  })

  if (typeFilter.value !== '') {
    params.set('type', typeFilter.value)
  }

  if (lifecycleFilter.value !== '') {
    params.set('lifecycle', lifecycleFilter.value)
  }

  if (mainFilter.value !== '') {
    params.set('main_channel', mainFilter.value)
  }

  if (originFilter.value !== '') {
    params.set('channel_of_origin', originFilter.value)
  }

  if (consentFilter.value !== '') {
    params.set('consent', consentFilter.value)
  }

  if (search.value !== '') {
    params.set('q', search.value)
  }

  return `/api/crm/contacts?${params.toString()}`
})

const { data: listPayload, refresh } = useFetch<ContactsPayload>(listUrl)

const rows = computed(() => listPayload.value?.data ?? [])
const meta = computed(() => listPayload.value?.meta)
const filters = computed(() => listPayload.value?.meta.filters)
const typeOptions = computed(() => filters.value?.type ?? [])
const lifecycleOptions = computed(() => filters.value?.lifecycle ?? [])
const originGroups = computed(() => formOptions.value?.origin ?? [])

async function loadDuplicates(): Promise<void> {
  try {
    const result = await request('/api/crm/contacts/duplicates') as { data: Array<ContactDuplicate> }
    duplicates.value = result.data
  } catch (error: unknown) {
    if (error instanceof ApiError && error.status === 403) {
      duplicates.value = []
    }
  }
}

async function loadFormOptions(): Promise<void> {
  if (!canCreateBooking.value) {
    return
  }

  formOptions.value = await request('/api/rms/bookings/form-options') as BookingFormOptions
}

onMounted(() => {
  void loadDuplicates()
  void loadFormOptions()
})

function setOpenQuery(id: number | null): void {
  const query = { ...route.query }

  if (id === null) {
    delete query.open
  } else {
    query.open = String(id)
  }

  void router.replace({ query })
}

async function openContact(id: number, writeQuery = true): Promise<void> {
  selected.value = await request(`/api/crm/contacts/${String(id)}`) as ContactProfile
  drawerOpen.value = true

  if (writeQuery) {
    setOpenQuery(id)
  }
}

function onDrawerOpen(value: boolean): void {
  drawerOpen.value = value

  if (!value) {
    setOpenQuery(null)
  }
}

async function onUpdated(profile: ContactProfile): Promise<void> {
  selected.value = profile
  await refresh()
}

function startMerge(leftId: number, rightId: number): void {
  mergeLeft.value = leftId
  mergeRight.value = rightId
  mergeOpen.value = true
}

async function onMerged(result: ContactMergeResult): Promise<void> {
  if (result.swapped) {
    toast.add({ title: t('crmContacts.mergeSwapped') })
  } else {
    toast.add({ title: t('crmContacts.mergedToast') })
  }

  await refresh()
  await loadDuplicates()
  selected.value = result.contact
  drawerOpen.value = true
  setOpenQuery(result.contact.id)
}

async function onUndone(): Promise<void> {
  await refresh()
  await loadDuplicates()

  if (selected.value !== null) {
    await openContact(selected.value.id, true)
  }
}

watch(
  () => route.query.open,
  async (open) => {
    const raw = Array.isArray(open) ? open[0] : open
    const id = typeof raw === 'string' ? Number(raw) : Number.NaN

    if (!Number.isFinite(id)) {
      drawerOpen.value = false
      return
    }

    if (drawerOpen.value && selected.value !== null && (
      selected.value.id === id
      || selected.value.alias_id === id
    )) {
      return
    }

    await openContact(id, false)
  },
  { immediate: true }
)
</script>

<template>
  <div>
    <p class="notice crm-notice">
      {{ t('crmContacts.notice') }}
    </p>

    <div
      v-if="duplicates.length > 0"
      class="panel"
    >
      <h3>{{ t('crmContacts.duplicatesTitle') }}</h3>
      <div class="bk-table-wrap">
        <table class="list">
          <tbody>
            <tr
              v-for="pair in duplicates"
              :key="`${String(pair.a.id)}-${String(pair.b.id)}`"
            >
              <td>
                <button
                  type="button"
                  class="lnk"
                  @click="openContact(pair.a.id)"
                >
                  {{ pair.a.name }}
                </button>
              </td>
              <td>
                <button
                  type="button"
                  class="lnk"
                  @click="openContact(pair.b.id)"
                >
                  {{ pair.b.name }}
                </button>
              </td>
              <td>
                <div class="crm-dup-reasons">
                  {{ pair.reasons.map(reason => reason === 'phone_e164' ? t('crmContacts.samePhone') : reason === 'name_country' ? t('crmContacts.sameNameCountry') : duplicateReasonLabel(reason)).join(' · ') }}
                </div>
              </td>
              <td class="list-actions">
                <UButton
                  v-if="canMerge"
                  variant="outline"
                  @click="startMerge(pair.a.id, pair.b.id)"
                >
                  {{ t('crmContacts.merge') }}
                </UButton>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h3>{{ t('crmContacts.title') }}</h3>
      <div class="crm-filters">
        <select v-model="typeFilter">
          <option value="">
            {{ t('crmContacts.filterType') }}
          </option>
          <option
            v-for="option in typeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <select v-model="lifecycleFilter">
          <option value="">
            {{ t('crmContacts.filterLifecycle') }}
          </option>
          <option
            v-for="option in lifecycleOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <select
          v-model="mainFilter"
          :disabled="formOptions === null"
        >
          <option value="">
            {{ t('crmContacts.filterMain') }}
          </option>
          <option
            v-for="option in formOptions?.main ?? []"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
        <select
          v-model="originFilter"
          :disabled="formOptions === null"
        >
          <option value="">
            {{ t('crmContacts.filterOrigin') }}
          </option>
          <optgroup
            v-for="group in originGroups"
            :key="group.group"
            :label="group.group"
          >
            <option
              v-for="option in group.options"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </optgroup>
        </select>
        <select v-model="consentFilter">
          <option value="">
            {{ t('crmContacts.filterConsent') }}
          </option>
          <option value="marketing">
            {{ t('crmContacts.consentMarketing') }}
          </option>
          <option value="transactional_only">
            {{ t('crmContacts.consentTransactional') }}
          </option>
        </select>
        <input
          v-model="searchInput"
          :placeholder="t('crmContacts.searchPlaceholder')"
          :aria-label="t('crmContacts.search')"
        >
      </div>
      <div class="bk-table-wrap">
        <table class="list">
          <thead>
            <tr>
              <th>{{ t('crmContacts.colName') }}</th>
              <th>{{ t('crmContacts.colType') }}</th>
              <th>{{ t('crmContacts.colCountry') }}</th>
              <th>{{ t('crmContacts.colLifecycle') }}</th>
              <th class="nw">
                {{ t('crmContacts.colMain') }}
              </th>
              <th class="nw">
                {{ t('crmContacts.colOrigin') }}
              </th>
              <th>{{ t('crmContacts.colLtv') }}</th>
              <th>{{ t('crmContacts.colSegment') }}</th>
              <th class="nw">
                {{ t('crmContacts.colConsent') }}
              </th>
              <th>{{ t('crmContacts.colNps') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-if="rows.length === 0"
              class="dr-empty"
            >
              <td colspan="10">
                {{ t('crmContacts.empty') }}
              </td>
            </tr>
            <tr
              v-for="row in rows"
              :key="row.id"
              class="bk-row"
              @click="openContact(row.id)"
            >
              <td>{{ row.name }}</td>
              <td>{{ filterLabel(typeOptions, row.type) }}</td>
              <td>{{ row.country ?? '—' }}</td>
              <td>
                <span
                  class="pill"
                  :class="lifecyclePillClass(row.lifecycle)"
                >{{ filterLabel(lifecycleOptions, row.lifecycle) }}</span>
              </td>
              <td class="nw crm-channel">
                {{ row.main_channel ?? '—' }}
              </td>
              <td class="nw crm-channel">
                {{ row.channel_of_origin ?? '—' }}
              </td>
              <td class="nw">
                {{ row.lifetime_value === 0 ? '—' : money(row.lifetime_value) }}
              </td>
              <td>
                <span
                  class="pill"
                  :class="segmentPillClass(row.segment)"
                >{{ row.segment }}</span>
              </td>
              <td class="nw">
                <span
                  class="pill"
                  :class="row.consent.marketing ? 'ok' : 'new'"
                >{{ consentPillLabel(row.consent.marketing) }}</span>
              </td>
              <td>{{ t('crmContacts.nps') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="crm-hint">
        {{ t('crmContacts.hint') }}
      </p>
      <div
        v-if="meta && meta.last_page > 1"
        class="list-pager"
      >
        <button
          type="button"
          :disabled="meta.current_page <= 1"
          @click="page -= 1"
        >
          {{ t('bookings.previous') }}
        </button>
        <span>{{ t('bookings.pager', { from: String(meta.from ?? 0), to: String(meta.to ?? 0), total: String(meta.total) }) }}</span>
        <button
          type="button"
          :disabled="meta.current_page >= meta.last_page"
          @click="page += 1"
        >
          {{ t('bookings.next') }}
        </button>
      </div>
    </div>

    <ContactDrawer
      :open="drawerOpen"
      :profile="selected"
      :type-options="typeOptions"
      :lifecycle-options="lifecycleOptions"
      @update:open="onDrawerOpen"
      @updated="onUpdated"
      @review-merge="startMerge"
      @open-contact="openContact"
      @undone="onUndone"
    />

    <MergeContactsModal
      v-model:open="mergeOpen"
      :left-id="mergeLeft"
      :right-id="mergeRight"
      :type-options="typeOptions"
      :lifecycle-options="lifecycleOptions"
      @merged="onMerged"
    />
  </div>
</template>
