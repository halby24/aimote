import { describe, it, expect } from 'vitest';
import { mapSessionUpdate } from './session-update-mapper.js';
import { makeSessionId } from '@acme/shared-types';
import type { SessionUpdate } from '@agentclientprotocol/sdk/dist/acp.js';

const SID = 'test-session';

function makeUpdate(sessionUpdate: string, data: Record<string, unknown> = {}): SessionUpdate {
  return { sessionUpdate, ...data } as unknown as SessionUpdate;
}

describe('mapSessionUpdate', () => {
  describe('agent_message_chunk', () => {
    it('maps text content to messageDelta', () => {
      const update = makeUpdate('agent_message_chunk', {
        content: { type: 'text', text: 'Hello' },
        messageId: 'msg-1',
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'messageDelta',
        sessionId: makeSessionId(SID),
        delta: 'Hello',
      });
    });

    it('returns empty for image content', () => {
      const update = makeUpdate('agent_message_chunk', {
        content: { type: 'image', data: 'base64...', mimeType: 'image/png' },
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(0);
    });

    it('uses default messageId when not provided', () => {
      const update = makeUpdate('agent_message_chunk', {
        content: { type: 'text', text: 'hi' },
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
    });
  });

  describe('user_message_chunk', () => {
    it('maps to messageDelta (replay use case)', () => {
      const update = makeUpdate('user_message_chunk', {
        content: { type: 'text', text: 'user said' },
        messageId: 'msg-u1',
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'messageDelta',
        delta: 'user said',
      });
    });
  });

  describe('agent_thought_chunk', () => {
    it('maps to thoughtDelta', () => {
      const update = makeUpdate('agent_thought_chunk', {
        content: { type: 'text', text: 'thinking...' },
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'thoughtDelta',
        delta: 'thinking...',
      });
    });
  });

  describe('tool_call', () => {
    it('maps to toolCallStarted', () => {
      const update = makeUpdate('tool_call', {
        toolCallId: 'tc-1',
        title: 'Read file',
        kind: 'read',
        status: 'in_progress',
        locations: [{ path: '/foo.ts', line: 10 }],
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'toolCallStarted',
        toolCall: {
          toolCallId: 'tc-1',
          title: 'Read file',
          kind: 'read',
          status: 'in_progress',
          locations: [{ path: '/foo.ts', line: 10 }],
        },
      });
    });

    it('maps tool call with diff content', () => {
      const update = makeUpdate('tool_call', {
        toolCallId: 'tc-2',
        title: 'Edit file',
        content: [{ type: 'diff', path: '/bar.ts', oldText: 'old', newText: 'new' }],
      });
      const events = mapSessionUpdate(SID, update);
      const event = events[0]!;
      if (event.type === 'toolCallStarted') {
        expect(event.toolCall.content).toEqual([
          { type: 'diff', path: '/bar.ts', oldText: 'old', newText: 'new' },
        ]);
      }
    });

    it('maps tool call with terminal content', () => {
      const update = makeUpdate('tool_call', {
        toolCallId: 'tc-3',
        title: 'Run command',
        content: [{ type: 'terminal', terminalId: 'term-1' }],
      });
      const events = mapSessionUpdate(SID, update);
      const event = events[0]!;
      if (event.type === 'toolCallStarted') {
        expect(event.toolCall.content).toEqual([
          { type: 'terminal', terminalId: 'term-1' },
        ]);
      }
    });
  });

  describe('tool_call_update', () => {
    it('maps to toolCallUpdated', () => {
      const update = makeUpdate('tool_call_update', {
        toolCallId: 'tc-1',
        status: 'completed',
        title: 'Done',
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'toolCallUpdated',
        toolCallId: 'tc-1',
        update: { toolCallId: 'tc-1', status: 'completed', title: 'Done' },
      });
    });
  });

  describe('plan', () => {
    it('maps to plan event', () => {
      const update = makeUpdate('plan', {
        entries: [
          { content: 'Step 1', priority: 'high', status: 'pending' },
          { content: 'Step 2', priority: 'low', status: 'completed' },
        ],
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'plan',
        entries: [
          { content: 'Step 1', priority: 'high', status: 'pending' },
          { content: 'Step 2', priority: 'low', status: 'completed' },
        ],
      });
    });
  });

  describe('available_commands_update', () => {
    it('maps to commandsChanged', () => {
      const update = makeUpdate('available_commands_update', {
        availableCommands: [
          { name: 'plan', description: 'Create plan' },
          { name: 'search', description: 'Search code', input: {} },
        ],
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'commandsChanged',
        commands: [
          { name: 'plan', description: 'Create plan' },
          { name: 'search', description: 'Search code', inputHint: 'unstructured' },
        ],
      });
    });
  });

  describe('current_mode_update', () => {
    it('maps to modeChanged', () => {
      const update = makeUpdate('current_mode_update', { currentModeId: 'architect' });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'modeChanged',
        modeId: 'architect',
      });
    });
  });

  describe('config_option_update', () => {
    it('returns empty array (ignored)', () => {
      const update = makeUpdate('config_option_update', { configId: 'foo' });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(0);
    });
  });

  describe('session_info_update', () => {
    it('maps to sessionInfoUpdate', () => {
      const update = makeUpdate('session_info_update', { title: 'My Session' });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'sessionInfoUpdate',
        title: 'My Session',
      });
    });

    it('maps null title', () => {
      const update = makeUpdate('session_info_update', { title: null });
      const events = mapSessionUpdate(SID, update);
      expect(events[0]).toMatchObject({
        type: 'sessionInfoUpdate',
        title: null,
      });
    });
  });

  describe('usage_update', () => {
    it('maps to usageUpdate with cost', () => {
      const update = makeUpdate('usage_update', {
        size: 200000,
        used: 50000,
        cost: { amount: 0.05, currency: 'USD' },
      });
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'usageUpdate',
        usage: {
          size: 200000,
          used: 50000,
          cost: { amount: 0.05, currency: 'USD' },
        },
      });
    });

    it('maps to usageUpdate without cost', () => {
      const update = makeUpdate('usage_update', {
        size: 100000,
        used: 10000,
      });
      const events = mapSessionUpdate(SID, update);
      expect(events[0]).toMatchObject({
        type: 'usageUpdate',
        usage: { size: 100000, used: 10000 },
      });
    });
  });

  describe('unknown type', () => {
    it('returns empty array', () => {
      const update = makeUpdate('totally_unknown_type', {});
      const events = mapSessionUpdate(SID, update);
      expect(events).toHaveLength(0);
    });
  });

  describe('empty content', () => {
    it('returns empty for text chunk with empty string', () => {
      const update = makeUpdate('agent_message_chunk', {
        content: { type: 'text', text: '' },
      });
      const events = mapSessionUpdate(SID, update);
      // Empty text returns empty because extractTextFromContentBlock returns ""
      // which is falsy
      expect(events).toHaveLength(0);
    });
  });
});
