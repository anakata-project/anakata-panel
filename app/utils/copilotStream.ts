export type CopilotRole = 'user' | 'assistant'

export type CopilotApproval = {
  id: string
  tool: string
  arguments: Record<string, unknown>
  reason: string | null
  decision: 'approve' | 'reject' | null
}

export type CopilotTurn = {
  id: string
  role: CopilotRole
  content: string
  pending: boolean
  error: string | null
  invoking: string | null
  approvals: Array<CopilotApproval>
}

export type CopilotConversation = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export type CopilotStreamEvent = {
  type?: string
  invocation_id?: string | null
  call_id?: string | null
  delta?: string
  tool_name?: string
  error_key?: string
  approvals?: Array<{
    id: string
    tool: string
    arguments?: Record<string, unknown>
    reason?: string | null
  }>
}

export const HIDDEN_COPILOT_TOOLS = ['FetchObjects', 'ResolveCalendar']

export function approvalsReady(approvals: Array<CopilotApproval>): boolean {
  return approvals.length > 0 && approvals.every(item => item.decision !== null)
}

export function decisionBody(approvals: Array<CopilotApproval>): Record<string, { action: 'approve' | 'reject' }> {
  return Object.fromEntries(approvals.map(item => [item.id, { action: item.decision ?? 'reject' }]))
}

export function applyCopilotEvent(turns: Array<CopilotTurn>, event: CopilotStreamEvent): Array<CopilotTurn> {
  const targetId = event.invocation_id ?? event.call_id ?? null
  const index = targetId === null
    ? turns.findLastIndex(turn => turn.role === 'assistant' && turn.pending)
    : turns.findIndex(turn => turn.id === targetId)

  if (index < 0) {
    return turns
  }

  const current = turns[index]
  if (!current) {
    return turns
  }

  const next = { ...current, approvals: current.approvals.map(item => ({ ...item })) }

  if (event.type === 'text_delta' && typeof event.delta === 'string') {
    next.content += event.delta
  }

  if (event.type === 'copilot.tool_invoking' && event.tool_name && !HIDDEN_COPILOT_TOOLS.includes(event.tool_name)) {
    next.invoking = event.tool_name
  }

  if (event.type === 'tool_approval_request' && event.approvals) {
    next.approvals = event.approvals.map(item => ({
      id: item.id,
      tool: item.tool,
      arguments: item.arguments ?? {},
      reason: item.reason ?? null,
      decision: null
    }))
    next.invoking = null
    next.pending = false
  }

  if (event.type === 'stream_end') {
    next.pending = false
    next.invoking = null
  }

  if (event.type === 'error' || event.type === 'copilot.failed') {
    next.error = event.error_key ?? 'copilot.stream.failed'
    next.pending = false
    next.invoking = null
  }

  return turns.map((turn, turnIndex) => turnIndex === index ? next : turn)
}

export function assistantTurn(callId: string): CopilotTurn {
  return {
    id: callId,
    role: 'assistant',
    content: '',
    pending: true,
    error: null,
    invoking: null,
    approvals: []
  }
}
