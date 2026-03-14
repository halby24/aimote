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
