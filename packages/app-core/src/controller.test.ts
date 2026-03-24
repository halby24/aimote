import { describe, it, expect, vi } from 'vitest';
import { ChatController } from './controller.js';
import type { AgentTransport } from '@acme/transport';
import { EventEmitter } from '@acme/transport';
import type { AgentEvent } from '@acme/shared-types';

function createMockTransport(): AgentTransport & { emit(e: AgentEvent): void } {
  const emitter = new EventEmitter();
  return {
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    startSession: vi.fn().mockResolvedValue({ sessionId: 'test-session' }),
    sendUserMessage: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    approve: vi.fn().mockResolvedValue(undefined),
    subscribe: (listener) => emitter.subscribe(listener),
    emit: (e) => emitter.emit(e),
  };
}

describe('ChatController', () => {
  describe('getConnectionStatus', () => {
    it('starts as idle', () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      expect(controller.getConnectionStatus()).toBe('idle');
    });

    it('updates to ready after connectionStatus event', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      transport.emit({ type: 'connectionStatus', status: 'ready' });
      expect(controller.getConnectionStatus()).toBe('ready');
    });
  });

  describe('connect', () => {
    it('calls transport.connect', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      expect(transport.connect).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('calls transport.disconnect', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      await controller.disconnect();
      expect(transport.disconnect).toHaveBeenCalledTimes(1);
    });

    it('stops receiving events after disconnect', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      await controller.disconnect();
      transport.emit({ type: 'connectionStatus', status: 'ready' });
      // Status should not change since we unsubscribed
      expect(controller.getConnectionStatus()).not.toBe('ready');
    });
  });

  describe('startSession', () => {
    it('returns the session id from transport', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      const sessionId = await controller.startSession();
      expect(sessionId).toBe('test-session');
    });

    it('creates session in store when sessionStarted event arrives', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();

      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });

      const session = controller.getActiveSession();
      expect(session).not.toBeNull();
      expect(session!.id).toBe('test-session');
    });
  });

  describe('sendMessage', () => {
    it('throws if no active session', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      await expect(controller.sendMessage('hello')).rejects.toThrow('No active session');
    });

    it('adds user message and marks it sent on success', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();

      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });

      await controller.sendMessage('hello');

      const session = controller.getActiveSession()!;
      const userMsg = session.messages.find((m) => m.role === 'user');
      expect(userMsg).toBeDefined();
      expect(userMsg!.content).toBe('hello');
      expect(userMsg!.status).toBe('completed');
    });

    it('marks user message as error when transport throws', async () => {
      const transport = createMockTransport();
      vi.mocked(transport.sendUserMessage).mockRejectedValueOnce(new Error('send failed'));
      const controller = new ChatController({ transport });
      await controller.connect();

      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });

      await expect(controller.sendMessage('hello')).rejects.toThrow('send failed');

      const session = controller.getActiveSession()!;
      const userMsg = session.messages.find((m) => m.role === 'user');
      expect(userMsg!.status).toBe('error');
    });
  });

  describe('messageDelta and messageCompleted handling', () => {
    it('builds assistant message content from deltas', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();

      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });
      transport.emit({ type: 'messageDelta', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>, messageId: 'msg-1' as ReturnType<typeof import('@acme/shared-types').makeMessageId>, delta: 'Hello' });
      transport.emit({ type: 'messageDelta', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>, messageId: 'msg-1' as ReturnType<typeof import('@acme/shared-types').makeMessageId>, delta: ' world' });
      transport.emit({ type: 'messageCompleted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>, messageId: 'msg-1' as ReturnType<typeof import('@acme/shared-types').makeMessageId> });

      const session = controller.getActiveSession()!;
      const assistantMsg = session.messages.find((m) => m.role === 'assistant');
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg!.content).toBe('Hello world');
      expect(assistantMsg!.status).toBe('completed');
    });
  });

  describe('ACP event handling', () => {
    function setupWithSession() {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      return { transport, controller };
    }

    async function connectAndStartSession(transport: ReturnType<typeof createMockTransport>, controller: ChatController) {
      await controller.connect();
      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });
      return controller;
    }

    it('handles toolCallStarted', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'toolCallStarted',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        toolCall: { toolCallId: 'tc1', title: 'Read file', kind: 'read', status: 'pending' },
      });
      const session = controller.getActiveSession()!;
      expect(session.toolCalls.get('tc1')).toBeDefined();
      expect(session.toolCalls.get('tc1')!.title).toBe('Read file');
    });

    it('handles toolCallUpdated', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'toolCallStarted',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        toolCall: { toolCallId: 'tc1', title: 'Read file', kind: 'read', status: 'pending' },
      });
      transport.emit({
        type: 'toolCallUpdated',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        toolCallId: 'tc1',
        update: { toolCallId: 'tc1', status: 'completed' },
      });
      const session = controller.getActiveSession()!;
      expect(session.toolCalls.get('tc1')!.status).toBe('completed');
    });

    it('handles plan', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      const entries = [{ content: 'Step 1', priority: 'high' as const, status: 'pending' as const }];
      transport.emit({
        type: 'plan',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        entries,
      });
      expect(controller.getActiveSession()!.plan).toEqual(entries);
    });

    it('handles thoughtDelta', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'thoughtDelta',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        delta: 'thinking...',
      });
      expect(controller.getActiveSession()!.thought).toBe('thinking...');
    });

    it('handles modeChanged', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'modeChanged',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        modeId: 'code',
      });
      expect(controller.getActiveSession()!.currentMode).toBe('code');
    });

    it('handles commandsChanged', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      const commands = [{ name: '/help', description: 'Show help' }];
      transport.emit({
        type: 'commandsChanged',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        commands,
      });
      expect(controller.getActiveSession()!.availableCommands).toEqual(commands);
    });

    it('handles usageUpdate', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      const usage = { size: 100000, used: 5000 };
      transport.emit({
        type: 'usageUpdate',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        usage,
      });
      expect(controller.getActiveSession()!.usage).toEqual(usage);
    });

    it('handles sessionInfoUpdate with title', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'sessionInfoUpdate',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        title: 'My Chat',
      });
      expect(controller.getActiveSession()!.title).toBe('My Chat');
    });

    it('ignores sessionInfoUpdate with undefined title', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'sessionInfoUpdate',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
      });
      expect(controller.getActiveSession()!.title).toBeNull();
    });

    it('handles permissionRequested', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      const payload = { options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' as const }] };
      transport.emit({
        type: 'permissionRequested',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        requestId: 'req-1' as ReturnType<typeof import('@acme/shared-types').makeRequestId>,
        payload,
      });
      const session = controller.getActiveSession()!;
      expect(session.pendingPermission).not.toBeNull();
      expect(session.pendingPermission!.requestId).toBe('req-1');
    });

    it('handles turnCompleted', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      // Set turn active first via sendMessage
      transport.emit({
        type: 'thoughtDelta',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        delta: 'thinking',
      });
      transport.emit({
        type: 'turnCompleted',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        stopReason: 'end_turn',
      });
      const session = controller.getActiveSession()!;
      expect(session.isTurnActive).toBe(false);
      expect(session.thought).toBe(''); // reset on turn end
    });

    it('turnCompleted completes streaming message', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      transport.emit({
        type: 'messageDelta',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        messageId: 'msg-1' as ReturnType<typeof import('@acme/shared-types').makeMessageId>,
        delta: 'Hello',
      });
      // No messageCompleted — turnCompleted should complete the message
      transport.emit({
        type: 'turnCompleted',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        stopReason: 'end_turn',
      });
      const session = controller.getActiveSession()!;
      const msg = session.messages.find((m) => m.role === 'assistant');
      expect(msg).toBeDefined();
      expect(msg!.status).toBe('completed');
    });

    it('handles error with active session', async () => {
      const { transport, controller } = setupWithSession();
      await connectAndStartSession(transport, controller);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      transport.emit({ type: 'error', code: 'ERR_001', message: 'Something failed' });
      const session = controller.getActiveSession()!;
      const errorMsg = session.messages.find((m) => m.role === 'system');
      expect(errorMsg).toBeDefined();
      expect(errorMsg!.content).toContain('ERR_001');
      consoleSpy.mockRestore();
    });
  });

  describe('startSession sets activeSessionId immediately', () => {
    it('sendMessage works without waiting for sessionStarted event', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      // Do NOT emit sessionStarted event — simulates race condition
      await controller.startSession();
      // Should not throw "No active session"
      await controller.sendMessage('hello');
      const session = controller.getActiveSession()!;
      expect(session.messages).toHaveLength(1);
      expect(session.messages[0]!.content).toBe('hello');
    });

    it('does not duplicate session when sessionStarted event arrives later', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      await controller.startSession();
      await controller.sendMessage('hello');
      // Now the event arrives
      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });
      const session = controller.getActiveSession()!;
      // Message should still be there (session not reset)
      expect(session.messages).toHaveLength(1);
    });
  });

  describe('sendMessage sets turn active', () => {
    it('sets isTurnActive to true when sending', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });
      await controller.sendMessage('hello');
      const session = controller.getActiveSession()!;
      expect(session.isTurnActive).toBe(true);
    });
  });

  describe('approve', () => {
    it('calls transport.approve and clears permission', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });
      const payload = { options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' as const }] };
      transport.emit({
        type: 'permissionRequested',
        sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId>,
        requestId: 'req-1' as ReturnType<typeof import('@acme/shared-types').makeRequestId>,
        payload,
      });
      await controller.approve('req-1', 'allow');
      expect(transport.approve).toHaveBeenCalledWith('req-1', 'allow');
      expect(controller.getActiveSession()!.pendingPermission).toBeNull();
    });
  });

  describe('config validation', () => {
    it('treats transport without validateConfig as valid', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      const validation = controller.getConfigValidation();
      expect(validation).toEqual({ valid: true, errors: [] });
    });

    it('sets connectionStatus to error and returns early when validation fails', async () => {
      const transport = createMockTransport();
      transport.validateConfig = vi.fn().mockResolvedValue({
        valid: false,
        errors: [{ code: 'COMMAND_NOT_FOUND', message: 'cmd not found' }],
      });
      const controller = new ChatController({ transport });
      await controller.connect();
      expect(controller.getConnectionStatus()).toBe('error');
      expect(controller.getConfigValidation()!.valid).toBe(false);
      // transport.connect should not have been called
      expect(transport.connect).not.toHaveBeenCalled();
    });

    it('proceeds to connect when validation passes', async () => {
      const transport = createMockTransport();
      transport.validateConfig = vi.fn().mockResolvedValue({
        valid: true,
        errors: [],
      });
      const controller = new ChatController({ transport });
      await controller.connect();
      expect(transport.connect).toHaveBeenCalledTimes(1);
    });

    it('catches transport.connect() throw and sets connectError', async () => {
      const transport = createMockTransport();
      vi.mocked(transport.connect).mockRejectedValueOnce(new Error('Spawn error: program not found'));
      const controller = new ChatController({ transport });
      await controller.connect(); // should NOT throw
      expect(controller.getConnectionStatus()).toBe('error');
      expect(controller.getConnectError()).toBe('Spawn error: program not found');
    });
  });

  describe('subscribe', () => {
    it('notifies listener when store changes', async () => {
      const transport = createMockTransport();
      const controller = new ChatController({ transport });
      await controller.connect();
      const listener = vi.fn();
      controller.subscribe(listener);

      transport.emit({ type: 'sessionStarted', sessionId: 'test-session' as ReturnType<typeof import('@acme/shared-types').makeSessionId> });

      expect(listener).toHaveBeenCalled();
    });
  });
});
