<script setup lang="ts">
import type { AutomationRow, AutomationSwitchInput } from '../../../types/api'
import { groupBySection } from '../../../components/crm/audienceHelpers'
import { firstApiMessage } from '../../../utils/apiForm'

const { t } = useI18n()
const { can } = useAuth()
const { request } = useApi()
const { format } = useDates()
const toast = useToast()

const canManage = computed(() => can('rules.manage'))
const rows = ref<Array<AutomationRow>>([])
const loadError = ref('')
const groups = computed(() => groupBySection(rows.value))
const confirmOpen = ref(false)
const saving = ref(false)
const reason = ref('')
const pending = ref<{ key: string, name: string, enabled: boolean } | null>(null)

onMounted(() => {
  void load()
})

async function load(): Promise<void> {
  try {
    const page = await request('/api/crm/automations') as { data: Array<AutomationRow> }
    rows.value = page.data
    loadError.value = ''
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmAutomations.failed')
  }
}

function askToggle(row: AutomationRow): void {
  pending.value = {
    key: row.key,
    name: row.name,
    enabled: !row.enabled
  }
  reason.value = ''
  confirmOpen.value = true
}

function cancelToggle(): void {
  confirmOpen.value = false
  pending.value = null
  reason.value = ''
}

async function applyToggle(): Promise<void> {
  if (pending.value === null || reason.value.trim() === '') {
    return
  }

  const body: AutomationSwitchInput = {
    enabled: pending.value.enabled,
    reason: reason.value.trim()
  }
  saving.value = true

  try {
    const saved = await request(`/api/crm/automations/${encodeURIComponent(pending.value.key)}`, {
      method: 'PATCH',
      body
    }) as AutomationRow
    rows.value = rows.value.map(item => item.key === saved.key ? saved : item)
    toast.add({ title: t('crmAutomations.updated') })
    cancelToggle()
  } catch (error: unknown) {
    loadError.value = firstApiMessage(error) ?? t('crmAutomations.failed')
  } finally {
    saving.value = false
  }
}

function journeyTo(key: string): string {
  return `/crm/marketing/journeys#${key}`
}

function alertTo(kind: string): { path: string, query: { kind: string } } {
  return {
    path: '/crm/engine/alerts',
    query: { kind }
  }
}

function disabledLine(row: AutomationRow): string {
  const when = row.disabled_at ? format(row.disabled_at, 'dateTime') : ''

  if (row.disabled_by && when !== '') {
    return t('crmAutomations.disabledBy', { name: row.disabled_by, when })
  }

  if (row.disabled_by) {
    return row.disabled_by
  }

  return when
}
</script>

<template>
  <div>
    <p
      v-if="loadError"
      class="warnbox"
    >
      {{ loadError }}
    </p>
    <div class="autosec">
      <section
        v-for="group in groups"
        :key="group.section"
      >
        <h2>{{ group.label }}</h2>
        <div
          v-for="row in group.rows"
          :key="row.key"
          class="auto"
          :class="{ unbuilt: !row.built }"
        >
          <div>
            <div class="nm">
              {{ row.name }}
            </div>
            <div class="sub">
              “{{ row.subject }}”
            </div>
            <p
              v-if="!row.built && row.not_built_note"
              class="auto-note"
            >
              {{ row.not_built_note }}
            </p>
            <p
              v-if="!row.switchable && row.locked_reason"
              class="auto-note"
            >
              {{ row.locked_reason }}
            </p>
            <p
              v-if="!row.enabled && row.disabled_reason"
              class="auto-note"
            >
              {{ row.disabled_reason }}
            </p>
            <p
              v-if="!row.enabled && disabledLine(row) !== ''"
              class="auto-note"
            >
              {{ disabledLine(row) }}
            </p>
            <div
              v-if="row.journey_key || row.alert_kind"
              class="auto-links"
            >
              <NuxtLink
                v-if="row.journey_key"
                :to="journeyTo(row.journey_key)"
              >
                {{ t('crmAutomations.openJourney') }}
              </NuxtLink>
              <NuxtLink
                v-if="row.alert_kind"
                :to="alertTo(row.alert_kind)"
              >
                {{ row.alert_kind }}
              </NuxtLink>
            </div>
          </div>
          <div class="k">
            {{ t('crmAutomations.trigger') }}<b>{{ row.trigger }}</b>
          </div>
          <div class="k">
            {{ t('crmAutomations.timing') }}<b>{{ row.timing }}</b>
          </div>
          <div class="k">
            {{ t('crmAutomations.where') }}<b>{{ row.location ?? '—' }}</b>
          </div>
          <div class="k">
            {{ t('crmAutomations.audience') }}<b>{{ row.audience }}</b>
          </div>
          <div class="k">
            {{ t('crmAutomations.kind') }}<b>{{ row.kind }}</b>
          </div>
          <button
            v-if="row.switchable && row.built && canManage"
            type="button"
            class="toggle"
            :class="{ off: !row.enabled }"
            :aria-pressed="row.enabled"
            :aria-label="t('crmAutomations.toggle', { name: row.name })"
            @click="askToggle(row)"
          />
        </div>
      </section>
    </div>

    <UModal
      :open="confirmOpen"
      :title="pending?.enabled ? t('crmAutomations.confirmOn') : t('crmAutomations.confirmOff')"
      @update:open="confirmOpen = $event"
    >
      <template #body>
        <form
          class="modal-form"
          @submit.prevent="applyToggle"
        >
          <p>{{ pending?.name }}</p>
          <div class="field">
            <label for="automation-reason">{{ t('crmAutomations.reason') }}</label>
            <textarea
              id="automation-reason"
              v-model="reason"
              rows="3"
              maxlength="1000"
            />
          </div>
          <div class="modal-actions">
            <UButton
              type="button"
              variant="outline"
              :disabled="saving"
              @click="cancelToggle"
            >
              {{ t('bookings.cancel') }}
            </UButton>
            <UButton
              type="submit"
              :loading="saving"
              :disabled="saving || reason.trim() === ''"
            >
              {{ pending?.enabled ? t('crmAutomations.turnOn') : t('crmAutomations.turnOff') }}
            </UButton>
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
