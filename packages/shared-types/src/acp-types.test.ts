import { describe, it, expect } from 'vitest';
import type { AgentEvent } from './events.js';
import type { ToolCallInfo, ToolCallUpdateInfo, PlanEntry, CommandInfo, UsageInfo, PermissionPayload } from './acp-types.js';
import { makeSessionId, makeRequestId } from './ids.js';

describe('ACP types integration with AgentEvent', () => {
  it('toolCallStarted event can be constructed', () => {
    const toolCall: ToolCallInfo = {
      toolCallId: 'tc-1',
      title: 'Read file',
      kind: 'read',
      status: 'in_progress',
      content: [{ type: 'text', text: 'hello' }],
      locations: [{ path: '/foo/bar.ts', line: 10 }],
    };
    const event: AgentEvent = {
      type: 'toolCallStarted',
      sessionId: makeSessionId('s1'),
      toolCall,
    };
    expect(event.type).toBe('toolCallStarted');
  });

  it('toolCallUpdated event can be constructed', () => {
    const update: ToolCallUpdateInfo = {
      toolCallId: 'tc-1',
      status: 'completed',
    };
    const event: AgentEvent = {
      type: 'toolCallUpdated',
      sessionId: makeSessionId('s1'),
      toolCallId: 'tc-1',
      update,
    };
    expect(event.type).toBe('toolCallUpdated');
  });

  it('plan event can be constructed', () => {
    const entries: PlanEntry[] = [
      { content: 'Step 1', priority: 'high', status: 'pending' },
      { content: 'Step 2', priority: 'medium', status: 'completed' },
    ];
    const event: AgentEvent = {
      type: 'plan',
      sessionId: makeSessionId('s1'),
      entries,
    };
    expect(event.type).toBe('plan');
  });

  it('thoughtDelta event can be constructed', () => {
    const event: AgentEvent = {
      type: 'thoughtDelta',
      sessionId: makeSessionId('s1'),
      delta: 'thinking...',
    };
    expect(event.type).toBe('thoughtDelta');
  });

  it('modeChanged event can be constructed', () => {
    const event: AgentEvent = {
      type: 'modeChanged',
      sessionId: makeSessionId('s1'),
      modeId: 'architect',
    };
    expect(event.type).toBe('modeChanged');
  });

  it('commandsChanged event can be constructed', () => {
    const commands: CommandInfo[] = [
      { name: 'plan', description: 'Create a plan' },
    ];
    const event: AgentEvent = {
      type: 'commandsChanged',
      sessionId: makeSessionId('s1'),
      commands,
    };
    expect(event.type).toBe('commandsChanged');
  });

  it('usageUpdate event can be constructed', () => {
    const usage: UsageInfo = {
      size: 200000,
      used: 50000,
      cost: { amount: 0.05, currency: 'USD' },
    };
    const event: AgentEvent = {
      type: 'usageUpdate',
      sessionId: makeSessionId('s1'),
      usage,
    };
    expect(event.type).toBe('usageUpdate');
  });

  it('sessionInfoUpdate event can be constructed', () => {
    const event: AgentEvent = {
      type: 'sessionInfoUpdate',
      sessionId: makeSessionId('s1'),
      title: 'My session',
    };
    expect(event.type).toBe('sessionInfoUpdate');
  });

  it('turnCompleted event can be constructed', () => {
    const event: AgentEvent = {
      type: 'turnCompleted',
      sessionId: makeSessionId('s1'),
      stopReason: 'end_turn',
    };
    expect(event.type).toBe('turnCompleted');
  });

  it('permissionRequested with PermissionPayload can be constructed', () => {
    const payload: PermissionPayload = {
      toolCall: { toolCallId: 'tc-1', title: 'Write file' },
      options: [
        { optionId: 'opt-1', name: 'Allow once', kind: 'allow_once' },
        { optionId: 'opt-2', name: 'Reject', kind: 'reject_once' },
      ],
    };
    const event: AgentEvent = {
      type: 'permissionRequested',
      sessionId: makeSessionId('s1'),
      requestId: makeRequestId('r1'),
      payload,
    };
    expect(event.type).toBe('permissionRequested');
  });

  it('discriminated union narrows correctly', () => {
    const event: AgentEvent = {
      type: 'toolCallStarted',
      sessionId: makeSessionId('s1'),
      toolCall: { toolCallId: 'tc-1', title: 'Test' },
    };
    if (event.type === 'toolCallStarted') {
      expect(event.toolCall.toolCallId).toBe('tc-1');
    }
  });
});
