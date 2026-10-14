import type { CopilotConversation, CopilotStreamEvent, CopilotTurn } from '../utils/copilotStream'
import { applyCopilotEvent, assistantTurn, decisionBody } from '../utils/copilotStream'

type ConversationPage = { data: Array<CopilotConversation> }
type MessagePage = {
  data: Array<{
    id: string
    role: string
    content: string
  }>
}
type AcceptedTurn = {
  call_id: string
  conversation_id: string
  channel: string
}

const OPEN = 'anakata.copilot.open'

export function useCopilot() {
  const open = useState(OPEN, () => false)
  const conversations = useState<Array<CopilotConversation>>('anakata.copilot.conversations', () => [])
  const activeId = useState<string | null>('anakata.copilot.active', () => null)
  const turns = useState<Array<CopilotTurn>>('anakata.copilot.turns', () => [])
  const sending = useState('anakata.copilot.sending', () => false)
  const loadError = useState<string | null>('anakata.copilot.error', () => null)
  const { request } = useApi()

  let subscribedId: string | null = null

  function onStreamEvent(event: CopilotStreamEvent): void {
    turns.value = applyCopilotEvent(turns.value, event)

    if (event.type === 'stream_end' || event.type === 'error' || event.type === 'copilot.failed' || event.type === 'tool_approval_request') {
      sending.value = false
    }
  }

  function subscribe(conversationId: string): void {
    if (!import.meta.client || subscribedId === conversationId) {
      return
    }

    const echo = useEcho()
    if (!echo) {
      return
    }

    if (subscribedId) {
      echo.leave(`copilot.${subscribedId}`)
    }

    subscribedId = conversationId
    const channel = echo.private(`copilot.${conversationId}`)
    const names = ['text_delta', 'stream_end', 'stream_start', 'tool_approval_request', 'error', 'copilot.failed', 'copilot.tool_invoking']

    for (const name of names) {
      channel.listen(`.${name}`, (payload: CopilotStreamEvent) => {
        onStreamEvent({ ...payload, type: payload.type ?? name })
      })
    }

    channel.listen('.copilot.conversation.titled', (payload: { conversation_id?: string, title?: string }) => {
      const id = payload.conversation_id
      const title = payload.title

      if (!id || !title) {
        return
      }

      const current = conversations.value.find(item => item.id === id)

      if (current) {
        current.title = title
      }
    })
  }

  async function refresh(): Promise<void> {
    const page = await request('/api/copilot/conversations') as ConversationPage
    conversations.value = page.data
  }

  async function openConversation(id: string): Promise<void> {
    activeId.value = id
    subscribe(id)
    const page = await request(`/api/copilot/conversations/${id}`) as MessagePage
    turns.value = page.data
      .filter(message => message.role === 'user' || message.role === 'assistant')
      .map(message => ({
        id: message.id,
        role: message.role === 'user' ? 'user' as const : 'assistant' as const,
        content: message.content,
        pending: false,
        error: null,
        invoking: null,
        approvals: []
      }))
  }

  async function start(): Promise<void> {
    const created = await request('/api/copilot/conversations', { method: 'POST' }) as { data: CopilotConversation }
    conversations.value = [created.data, ...conversations.value]
    activeId.value = created.data.id
    turns.value = []
    subscribe(created.data.id)
  }

  async function send(message: string): Promise<void> {
    const conversationId = activeId.value
    const text = message.trim()

    if (!conversationId || text === '' || sending.value) {
      return
    }

    sending.value = true
    loadError.value = null
    turns.value = [
      ...turns.value,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content: text,
        pending: false,
        error: null,
        invoking: null,
        approvals: []
      }
    ]

    try {
      const accepted = await request(`/api/copilot/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: {
          message: text,
          client_message_id: crypto.randomUUID()
        }
      }) as AcceptedTurn

      turns.value = [...turns.value, assistantTurn(accepted.call_id)]
    } catch (error) {
      sending.value = false
      loadError.value = error instanceof Error ? error.message : 'copilot.stream.failed'
    }
  }

  async function submitDecisions(turnId: string): Promise<void> {
    const conversationId = activeId.value
    const turn = turns.value.find(item => item.id === turnId)

    if (!conversationId || !turn) {
      return
    }

    sending.value = true

    try {
      const accepted = await request(`/api/copilot/conversations/${conversationId}/decisions`, {
        method: 'POST',
        body: { decisions: decisionBody(turn.approvals) }
      }) as AcceptedTurn

      turns.value = turns.value.map(item => item.id === turnId
        ? { ...item, approvals: [] }
        : item)
      turns.value = [...turns.value, assistantTurn(accepted.call_id)]
    } catch (error) {
      sending.value = false
      loadError.value = error instanceof Error ? error.message : 'copilot.stream.failed'
    }
  }

  function toggle(): void {
    open.value = !open.value
  }

  return {
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
    submitDecisions,
    toggle
  }
}
