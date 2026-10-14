<script setup lang="ts">
import type { CopilotApproval } from '../../utils/copilotStream'
import { approvalsReady } from '../../utils/copilotStream'
import { renderCopilotMarkdown } from '../../utils/copilotMarkdown'

const { t } = useI18n()
const toast = useToast()
const {
  open,
  conversations,
  activeId,
  turns,
  sending,
  loadError,
  refresh,
  openConversation,
  start,
  send,
  submitDecisions
} = useCopilot()

const draft = ref('')
const messagesEl = ref<HTMLElement | null>(null)

const suggestions = computed(() => [
  { label: t('copilot.suggestFind'), icon: 'i-lucide-users', prompt: t('copilot.suggestFindPrompt') },
  { label: t('copilot.suggestDeal'), icon: 'i-lucide-handshake', prompt: t('copilot.suggestDealPrompt') },
  { label: t('copilot.suggestAdd'), icon: 'i-lucide-user-plus', prompt: t('copilot.suggestAddPrompt') },
  { label: t('copilot.suggestRecent'), icon: 'i-lucide-bar-chart-2', prompt: t('copilot.suggestRecentPrompt') }
])

const ordered = computed(() => {
  return [...conversations.value].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
})

const isEmpty = computed(() => turns.value.length === 0 && !sending.value)

const activeTitle = computed(() => {
  const current = conversations.value.find(item => item.id === activeId.value)
  return current ? titleOf(current.title) : t('copilot.untitled')
})

const canSend = computed(() => draft.value.trim() !== '' && !sending.value)

function titleOf(title: string): string {
  return title === 'New conversation' ? t('copilot.untitled') : title
}

function toolLabel(tool: string): string {
  const key = `copilot.tools.${tool}`
  const translated = t(key)
  return translated === key ? tool : translated
}

function argumentLines(approval: CopilotApproval): Array<string> {
  return Object.entries(approval.arguments).map(([key, value]) => `${key}: ${String(value)}`)
}

function when(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 1) {
    return t('copilot.justNow')
  }

  if (minutes < 60) {
    return t('copilot.minutesAgo', { count: minutes })
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return t('copilot.hoursAgo', { count: hours })
  }

  const days = Math.floor(hours / 24)

  if (days < 7) {
    return t('copilot.daysAgo', { count: days })
  }

  return new Date(iso).toLocaleDateString()
}

async function ensureList(): Promise<void> {
  try {
    await refresh()
  } catch (error) {
    toast.add({
      title: t('copilot.unavailable'),
      description: error instanceof Error ? error.message : undefined,
      color: 'error'
    })
  }
}

watch(open, (isOpen) => {
  if (!isOpen) {
    return
  }

  void (async () => {
    await ensureList()

    if (!activeId.value && ordered.value[0]) {
      await openConversation(ordered.value[0].id)
    }
  })()
})

watch(turns, () => {
  void nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight
    }
  })
}, { deep: true })

async function onSend(): Promise<void> {
  const text = draft.value.trim()

  if (text === '' || sending.value) {
    return
  }

  draft.value = ''

  if (!activeId.value) {
    await start()
  }

  await send(text)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    void onSend()
  }
}

function choose(approval: CopilotApproval, decision: 'approve' | 'reject'): void {
  approval.decision = decision
}

async function confirm(turnId: string): Promise<void> {
  await submitDecisions(turnId)
}
</script>

<template>
  <USlideover
    :open="open"
    side="bottom"
    :overlay="false"
    :close="false"
    :transition="false"
    :ui="{ content: 'copilot-panel ring-0 shadow-none divide-y-0' }"
    @update:open="open = $event"
  >
    <template #content>
      <div class="copilot">
        <aside class="copilot-list">
          <div class="copilot-list-head">
            <button
              type="button"
              class="copilot-new"
              @click="start"
            >
              <UIcon
                name="i-lucide-plus"
                class="copilot-new-icon"
              />
              {{ t('copilot.new') }}
            </button>
          </div>
          <div class="copilot-list-scroll">
            <p
              v-if="ordered.length === 0"
              class="copilot-list-empty"
            >
              {{ t('copilot.listEmpty') }}
            </p>
            <button
              v-for="conversation in ordered"
              :key="conversation.id"
              type="button"
              class="copilot-item"
              :class="{ 'is-active': conversation.id === activeId }"
              @click="openConversation(conversation.id)"
            >
              <span class="copilot-item-title">{{ titleOf(conversation.title) }}</span>
              <span class="copilot-when">{{ when(conversation.updated_at) }}</span>
            </button>
          </div>
        </aside>

        <section class="copilot-thread">
          <template v-if="isEmpty">
            <div class="copilot-head">
              <span />
              <button
                type="button"
                class="copilot-close"
                :aria-label="t('copilot.close')"
                @click="open = false"
              >
                <UIcon name="i-lucide-x" />
              </button>
            </div>
            <div class="copilot-hero">
              <span
                class="copilot-mark"
                aria-hidden="true"
              >
                <UIcon
                  name="i-lucide-bot"
                  class="copilot-mark-icon"
                />
              </span>
              <h2 class="copilot-greeting">
                {{ t('copilot.greeting') }}
              </h2>
              <form
                class="copilot-composer"
                @submit.prevent="onSend"
              >
                <div class="copilot-box">
                  <textarea
                    v-model="draft"
                    class="copilot-field"
                    rows="2"
                    :placeholder="t('copilot.placeholder')"
                    :disabled="sending"
                    @keydown="onKeydown"
                  />
                  <button
                    type="submit"
                    class="copilot-send"
                    :disabled="!canSend"
                    :aria-label="t('copilot.send')"
                  >
                    <UIcon name="i-lucide-arrow-up" />
                  </button>
                </div>
                <p class="copilot-disclaimer">
                  {{ t('copilot.disclaimer') }}
                </p>
              </form>
              <div class="copilot-suggestions">
                <button
                  v-for="suggestion in suggestions"
                  :key="suggestion.label"
                  type="button"
                  class="copilot-chip"
                  @click="draft = suggestion.prompt"
                >
                  <UIcon :name="suggestion.icon" />
                  {{ suggestion.label }}
                </button>
              </div>
              <p
                v-if="loadError"
                class="copilot-error"
              >
                {{ loadError }}
              </p>
            </div>
          </template>

          <template v-else>
            <div class="copilot-head copilot-head--chat">
              <h3 class="copilot-title">
                {{ activeTitle }}
              </h3>
              <button
                type="button"
                class="copilot-close"
                :aria-label="t('copilot.close')"
                @click="open = false"
              >
                <UIcon name="i-lucide-x" />
              </button>
            </div>
            <div
              ref="messagesEl"
              class="copilot-turns"
            >
              <div class="copilot-messages">
                <article
                  v-for="turn in turns"
                  :key="turn.id"
                  class="copilot-turn"
                  :class="turn.role === 'user' ? 'is-user' : 'is-assistant'"
                >
                  <p
                    v-if="turn.role === 'user' && turn.content"
                    class="copilot-bubble"
                  >
                    {{ turn.content }}
                  </p>
                  <div
                    v-else
                    class="copilot-row"
                  >
                    <span
                      class="copilot-mark copilot-mark--sm"
                      aria-hidden="true"
                    >
                      <UIcon
                        name="i-lucide-bot"
                        class="copilot-mark-icon"
                      />
                    </span>
                    <div class="copilot-body">
                      <!-- Sanitized in renderCopilotMarkdown. -->
                      <!-- eslint-disable vue/no-v-html -->
                      <div
                        v-if="turn.content"
                        class="copilot-text"
                        v-html="renderCopilotMarkdown(turn.content)"
                      />
                      <!-- eslint-enable vue/no-v-html -->
                      <p
                        v-if="turn.pending && !turn.content && turn.approvals.length === 0"
                        class="copilot-dots"
                        :aria-label="turn.invoking ? toolLabel(turn.invoking) : t('copilot.thinking')"
                      >
                        <span /><span /><span />
                      </p>
                      <p
                        v-else-if="turn.invoking"
                        class="copilot-status"
                      >
                        {{ toolLabel(turn.invoking) }}
                      </p>
                      <p
                        v-if="turn.error"
                        class="copilot-error"
                      >
                        {{ t('copilot.failed') }}
                      </p>
                      <div
                        v-if="turn.approvals.length"
                        class="copilot-approvals"
                      >
                        <div
                          v-for="approval in turn.approvals"
                          :key="approval.id"
                          class="copilot-approval"
                        >
                          <p class="copilot-approval-title">
                            {{ approval.reason ?? toolLabel(approval.tool) }}
                          </p>
                          <p
                            v-for="line in argumentLines(approval)"
                            :key="line"
                            class="copilot-arg"
                          >
                            {{ line }}
                          </p>
                          <div class="copilot-decision">
                            <button
                              type="button"
                              :class="{ 'is-active': approval.decision === 'approve' }"
                              @click="choose(approval, 'approve')"
                            >
                              {{ t('copilot.approve') }}
                            </button>
                            <button
                              type="button"
                              :class="{ 'is-active': approval.decision === 'reject' }"
                              @click="choose(approval, 'reject')"
                            >
                              {{ t('copilot.reject') }}
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          class="copilot-confirm"
                          :disabled="!approvalsReady(turn.approvals) || sending"
                          @click="confirm(turn.id)"
                        >
                          {{ t('copilot.confirm') }}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
                <p
                  v-if="loadError"
                  class="copilot-error"
                >
                  {{ loadError }}
                </p>
              </div>
            </div>
            <form
              class="copilot-composer copilot-composer--dock"
              @submit.prevent="onSend"
            >
              <div class="copilot-box">
                <textarea
                  v-model="draft"
                  class="copilot-field"
                  rows="1"
                  :placeholder="t('copilot.placeholder')"
                  :disabled="sending"
                  @keydown="onKeydown"
                />
                <button
                  type="submit"
                  class="copilot-send"
                  :disabled="!canSend"
                  :aria-label="t('copilot.send')"
                >
                  <UIcon name="i-lucide-arrow-up" />
                </button>
              </div>
              <p class="copilot-disclaimer">
                {{ t('copilot.disclaimer') }}
              </p>
            </form>
          </template>
        </section>
      </div>
    </template>
  </USlideover>
</template>
