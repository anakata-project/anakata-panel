<script setup lang="ts">
import type {
  DepartureGuestExperience,
  GuestExperienceDeparture,
  NpsView,
  PreferenceSource
} from '../../../types/api'
import DocumentPreviewModal from '../../../components/documents/DocumentPreviewModal.vue'
import PreferenceModal from '../../../components/guest-experience/PreferenceModal.vue'
import {
  defaultDepartureId,
  npsScoreClass,
  prefStatusClass
} from '../../../components/guest-experience/guestExperienceHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

type ExperienceGuest = DepartureGuestExperience['guests'][number]

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()

const canManage = computed(() => can('guest_experience.manage'))
const canSensitive = computed(() => can('guests.view_sensitive'))

const departures = ref<Array<GuestExperienceDeparture>>([])
const selectedId = ref<number | null>(null)
const experience = ref<DepartureGuestExperience | null>(null)
const nps = ref<NpsView | null>(null)
const loadError = ref('')
const npsError = ref('')

const preferenceOpen = ref(false)
const preferenceGuest = ref<ExperienceGuest | null>(null)
const briefOpen = ref(false)

const briefHtml = computed(() => (
  selectedId.value === null
    ? null
    : `/api/rms/departures/${String(selectedId.value)}/hotel-manager-brief`
))

const briefPdf = computed(() => (
  briefHtml.value === null ? null : `${briefHtml.value}?format=pdf`
))

watch(selectedId, (id) => {
  if (id !== null) {
    void loadExperience(id)
  }
})

onMounted(() => {
  void loadDepartures()

  if (canManage.value) {
    void loadNps()
  }
})

function dash(value: string | null): string {
  return value === null || value === '' ? '—' : value
}

function sourceLabel(source: PreferenceSource | null): string {
  if (source === 'GUEST_LINK') {
    return t('guestExperience.sourceGuest')
  }

  if (source === 'STAFF') {
    return t('guestExperience.sourceStaff')
  }

  return ''
}

function statusDetail(guest: ExperienceGuest): string {
  if (guest.status === 'ANSWERED') {
    const when = guest.answered_at === null ? '' : format(guest.answered_at, 'dateTime')

    return [when, sourceLabel(guest.source)].filter(part => part !== '').join(' · ')
  }

  if (guest.status === 'SCHEDULED') {
    return format(guest.send_date, 'short')
  }

  return ''
}

function departureLabel(row: GuestExperienceDeparture): string {
  return t('guestExperience.departureOption', {
    date: format(row.date, 'short'),
    yacht: row.yacht,
    count: String(row.passengers)
  })
}

function openPreferences(guest: ExperienceGuest): void {
  preferenceGuest.value = guest
  preferenceOpen.value = true
}

async function loadDepartures(): Promise<void> {
  try {
    const payload = await request('/api/rms/guest-experience/departures') as {
      data: Array<GuestExperienceDeparture>
    }
    departures.value = payload.data
    loadError.value = ''
    selectedId.value = defaultDepartureId(payload.data, format(new Date(), 'iso'))
  } catch (caught: unknown) {
    departures.value = []
    experience.value = null
    loadError.value = firstApiMessage(caught) ?? t('guestExperience.loadFailed')
  }
}

async function loadExperience(id: number): Promise<void> {
  try {
    const payload = await request(`/api/rms/departures/${String(id)}/guest-experience`) as {
      data: DepartureGuestExperience
    }
    experience.value = payload.data
    loadError.value = ''
  } catch (caught: unknown) {
    experience.value = null
    loadError.value = firstApiMessage(caught) ?? t('guestExperience.loadFailed')
  }
}

async function loadNps(): Promise<void> {
  try {
    nps.value = await request('/api/rms/guest-experience/nps') as NpsView
    npsError.value = ''
  } catch (caught: unknown) {
    nps.value = null
    npsError.value = firstApiMessage(caught) ?? t('guestExperience.loadFailed')
  }
}

function refreshExperience(): void {
  if (selectedId.value !== null) {
    void loadExperience(selectedId.value)
  }
}

function questionnaireSub(view: DepartureGuestExperience): string {
  const date = format(view.send_date, 'short')

  return view.send_state === 'sent'
    ? t('guestExperience.sentOn', { date })
    : t('guestExperience.sendsOn', { date })
}
</script>

<template>
  <div>
    <p class="notice">
      {{ t('guestExperience.notice') }}
    </p>

    <div
      v-if="departures.length > 0"
      class="field gx-departure"
    >
      <label for="gx-departure">{{ t('guestExperience.departure') }}</label>
      <select
        id="gx-departure"
        v-model.number="selectedId"
      >
        <option
          v-for="row in departures"
          :key="row.departure_id"
          :value="row.departure_id"
        >
          {{ departureLabel(row) }}
        </option>
      </select>
    </div>

    <p
      v-if="loadError !== ''"
      class="note"
    >
      {{ loadError }}
    </p>
    <p
      v-else-if="departures.length === 0"
      class="note"
    >
      {{ t('guestExperience.emptyDepartures') }}
    </p>

    <template v-if="experience">
      <div class="krow">
        <AnkKpi
          :label="t('guestExperience.kpiGuests')"
          :sub="t('guestExperience.kpiBookings', { count: String(experience.kpis.bookings) })"
        >
          {{ experience.kpis.guests }}
        </AnkKpi>
        <AnkKpi
          :label="t('guestExperience.kpiAnswered')"
          :sub="questionnaireSub(experience)"
        >
          {{ experience.kpis.answered }}/{{ experience.kpis.total }}
        </AnkKpi>
        <AnkKpi
          :label="t('guestExperience.kpiCelebrations')"
          :sub="t('guestExperience.kpiCelebrationsSub')"
        >
          {{ experience.kpis.celebrations }}
        </AnkKpi>
        <AnkKpi
          :label="t('guestExperience.kpiAccess')"
          :sub="canSensitive ? t('guestExperience.accessOps') : t('guestExperience.accessRestricted')"
        >
          <span class="gx-warn">{{ experience.kpis.accessibility_or_medical }}</span>
        </AnkKpi>
      </div>

      <div class="panel">
        <h3>{{ t('guestExperience.preferencesTitle') }}</h3>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th>{{ t('guestExperience.colGuest') }}</th>
                <th>{{ t('guestExperience.colCabin') }}</th>
                <th>{{ t('guestExperience.colStatus') }}</th>
                <th>{{ t('guestExperience.colDietary') }}</th>
                <th>{{ t('guestExperience.colCelebration') }}</th>
                <th>{{ t('guestExperience.colActivity') }}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="guest in experience.guests"
                :key="guest.guest_id"
              >
                <td>
                  {{ guest.name }}
                  <div class="gmeta">
                    {{ guest.booking_reference }} · {{ guest.email ?? guest.email_note ?? '—' }}
                  </div>
                </td>
                <td>{{ guest.cabin }}</td>
                <td>
                  <span
                    class="pill"
                    :class="prefStatusClass(guest.status)"
                  >{{ guest.status_label }}</span>
                  <div
                    v-if="statusDetail(guest) !== ''"
                    class="gmeta"
                  >
                    {{ statusDetail(guest) }}
                  </div>
                </td>
                <td>{{ dash(guest.dietary) }}</td>
                <td>{{ dash(guest.celebration) }}</td>
                <td>{{ dash(guest.activity) }}</td>
                <td>
                  <button
                    type="button"
                    class="mini"
                    @click="openPreferences(guest)"
                  >
                    {{ guest.status === 'ANSWERED' ? t('guestExperience.view') : t('guestExperience.record') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="gx-brief">
          <UButton
            variant="outline"
            :disabled="selectedId === null"
            @click="briefOpen = true"
          >
            {{ t('guestExperience.brief') }}
          </UButton>
        </div>
      </div>
    </template>

    <div
      v-if="canManage"
      class="panel"
    >
      <h3>{{ t('guestExperience.npsTitle') }}</h3>
      <p
        v-if="npsError !== ''"
        class="note"
      >
        {{ npsError }}
      </p>
      <p
        v-else-if="nps !== null && nps.responses.length === 0"
        class="note gx-empty"
      >
        {{ t('guestExperience.emptyNps', {
          hours: String(nps.facts.survey_hours_after_return),
          date: nps.facts.first_expected_survey_on === null ? '—' : format(nps.facts.first_expected_survey_on, 'short'),
          alert: String(nps.facts.alert_below),
          review: String(nps.facts.review_request_from)
        }) }}
      </p>
      <template v-else-if="nps !== null">
        <div class="krow gx-nps-kpis">
          <AnkKpi
            :label="t('guestExperience.kpiAverage')"
            :sub="t('guestExperience.kpiResponses', { count: String(nps.kpis.responses) })"
          >
            {{ nps.kpis.average_score ?? '—' }}
          </AnkKpi>
          <AnkKpi
            :label="t('guestExperience.kpiAlerts', { threshold: String(nps.facts.alert_below) })"
          >
            <span class="gx-coral">{{ nps.kpis.alerts_below }}</span>
          </AnkKpi>
          <AnkKpi
            :label="t('guestExperience.kpiReviews', { threshold: String(nps.facts.review_request_from) })"
            :sub="t('guestExperience.kpiReviewsSub')"
          >
            {{ nps.kpis.review_requests_sent }}
          </AnkKpi>
        </div>
        <div class="bk-table-wrap">
          <table class="list">
            <thead>
              <tr>
                <th>{{ t('guestExperience.colBooking') }}</th>
                <th>{{ t('guestExperience.colGuest') }}</th>
                <th>{{ t('guestExperience.colScore') }}</th>
                <th>{{ t('guestExperience.colRecommend') }}</th>
                <th>{{ t('guestExperience.colBest') }}</th>
                <th>{{ t('guestExperience.colBetter') }}</th>
                <th>{{ t('guestExperience.colCrew') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, index) in nps.responses"
                :key="`${row.booking_reference}-${String(index)}`"
              >
                <td class="mono">
                  {{ row.booking_reference }}
                </td>
                <td>{{ row.guest }}</td>
                <td>
                  <span
                    class="pill"
                    :class="npsScoreClass(row.score, nps.facts.alert_below, nps.facts.review_request_from)"
                  >{{ row.score }}</span>
                </td>
                <td>{{ row.recommend ?? '—' }}</td>
                <td>{{ dash(row.best) }}</td>
                <td>{{ dash(row.better) }}</td>
                <td>{{ dash(row.crew) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </div>

    <PreferenceModal
      v-model:open="preferenceOpen"
      :guest-id="preferenceGuest?.guest_id ?? null"
      :name="preferenceGuest?.name ?? ''"
      :meta="preferenceGuest === null ? '' : `${preferenceGuest.booking_reference} · ${preferenceGuest.cabin}`"
      @saved="refreshExperience"
    />

    <DocumentPreviewModal
      v-model:open="briefOpen"
      :title="t('guestExperience.briefTitle')"
      :html-path="briefHtml"
      :file-path="briefPdf"
      file-name="hotel-manager-brief.pdf"
    />
  </div>
</template>

<style scoped>
.gx-departure {
  max-width: 420px;
}

.gx-warn {
  color: var(--warn);
}

.gx-coral {
  color: var(--coral-400);
}

.gx-brief {
  padding: 12px 20px;
}

.gx-empty {
  padding: 16px 20px;
}

.gx-nps-kpis {
  margin: 14px 20px;
}
</style>
