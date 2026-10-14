import { describe, expect, it } from 'vitest'
import {
  applyCopilotEvent,
  approvalsReady,
  assistantTurn,
  decisionBody,
  type CopilotTurn
} from '../../app/utils/copilotStream'

function pending(id: string): Array<CopilotTurn> {
  return [assistantTurn(id)]
}

describe('copilot stream', () => {
  it('appends text to the matching turn', () => {
    const turns = applyCopilotEvent(pending('call-1'), {
      type: 'text_delta',
      invocation_id: 'call-1',
      delta: 'Hello'
    })

    expect(turns[0]?.content).toBe('Hello')
    expect(turns[0]?.pending).toBe(true)
  })

  it('stops the turn when the stream ends', () => {
    const turns = applyCopilotEvent(pending('call-1'), {
      type: 'stream_end',
      invocation_id: 'call-1'
    })

    expect(turns[0]?.pending).toBe(false)
  })

  it('records an approval request and waits until every card is decided', () => {
    const turns = applyCopilotEvent(pending('call-1'), {
      type: 'tool_approval_request',
      invocation_id: 'call-1',
      approvals: [{
        id: 'tool-1',
        tool: 'CreateContact',
        arguments: { name: 'Ada' },
        reason: 'Create a contact'
      }]
    })

    const approvals = turns[0]?.approvals ?? []
    expect(approvalsReady(approvals)).toBe(false)

    const decided = approvals.map(item => ({ ...item, decision: 'approve' as const }))
    expect(approvalsReady(decided)).toBe(true)
    expect(decisionBody(decided)).toEqual({ 'tool-1': { action: 'approve' } })
  })

  it('ignores internal lookup tools and surfaces a failure', () => {
    const lookedUp = applyCopilotEvent(pending('call-1'), {
      type: 'copilot.tool_invoking',
      invocation_id: 'call-1',
      tool_name: 'FetchObjects'
    })
    expect(lookedUp[0]?.invoking).toBeNull()

    const failed = applyCopilotEvent(lookedUp, {
      type: 'copilot.failed',
      call_id: 'call-1',
      error_key: 'copilot.stream.failed'
    })
    expect(failed[0]?.error).toBe('copilot.stream.failed')
    expect(failed[0]?.pending).toBe(false)
  })
})
