import { describe, it, expect } from 'vitest';
import { buildChatScreenViewModel, type PresenterInput } from './presenter.js';
import type { ChatStore } from '@acme/app-core';
import type { ChatMessage } from '@acme/shared-types';
import { makeSessionId, makeMessageId } from '@acme/shared-types';

function makeEmptyStore(): ChatStore {
  return {
    sessions: new Map(),
    activeSessionId: null,
  };
}

function makeStoreWithSession(sessionId: string, messages: readonly ChatMessage[] = []): ChatStore {
  const sid = makeSessionId(sessionId);
  return {
    sessions: new Map([[sid, {
      id: sid,
      messages,
      createdAt: Date.now(),
      toolCalls: new Map(),
      plan: [],
      thought: '',
      currentMode: null,
      availableCommands: [],
      usage: null,
      title: null,
      pendingPermission: null,
      isTurnActive: false,
    }]]),
    activeSessionId: sid,
  };
}

const baseInput = (overrides: Partial<PresenterInput> = {}): PresenterInput => ({
  store: makeEmptyStore(),
  connectionStatus: 'ready',
  inputValue: '',
  isSubmitting: false,
  ...overrides,
});

describe('buildChatScreenViewModel', () => {
  describe('messages', () => {
    it('returns empty messages when no active session', () => {
      const vm = buildChatScreenViewModel(baseInput());
      expect(vm.messages).toHaveLength(0);
    });

    it('maps session messages to view models', () => {
      const mid = makeMessageId('m1');
      const sid = makeSessionId('s1');
      const store = makeStoreWithSession('s1', [
        { id: mid, sessionId: sid, role: 'user', content: 'hi', status: 'completed', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages).toHaveLength(1);
      expect(vm.messages[0]!.content).toBe('hi');
      expect(vm.messages[0]!.role).toBe('user');
    });

    it('sets isStreaming=true for streaming status', () => {
      const sid = makeSessionId('s1');
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: sid, role: 'assistant', content: 'partial', status: 'streaming', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages[0]!.isStreaming).toBe(true);
    });

    it('sets isError=true for error status', () => {
      const sid = makeSessionId('s1');
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: sid, role: 'user', content: 'hi', status: 'error', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages[0]!.isError).toBe(true);
    });

    it('sets isCancelled=true for cancelled status', () => {
      const sid = makeSessionId('s1');
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: sid, role: 'assistant', content: '', status: 'cancelled', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages[0]!.isCancelled).toBe(true);
    });
  });

  describe('connectionStatus and isConnected', () => {
    it('isConnected=true when status is ready', () => {
      const vm = buildChatScreenViewModel(baseInput({ connectionStatus: 'ready' }));
      expect(vm.isConnected).toBe(true);
      expect(vm.connectionStatus).toBe('ready');
    });

    it('isConnected=false when status is not ready', () => {
      for (const status of ['idle', 'connecting', 'disconnected', 'error'] as const) {
        const vm = buildChatScreenViewModel(baseInput({ connectionStatus: status }));
        expect(vm.isConnected).toBe(false);
      }
    });
  });

  describe('input', () => {
    it('reflects inputValue', () => {
      const vm = buildChatScreenViewModel(baseInput({ inputValue: 'typed text' }));
      expect(vm.input.value).toBe('typed text');
    });

    it('reflects isSubmitting', () => {
      const vm = buildChatScreenViewModel(baseInput({ isSubmitting: true }));
      expect(vm.input.isSubmitting).toBe(true);
    });

    it('isDisabled=false when no streaming and no pending permission', () => {
      const sid = makeSessionId('s1');
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: sid, role: 'user', content: 'hi', status: 'completed', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store, connectionStatus: 'ready' }));
      expect(vm.input.isDisabled).toBe(false);
    });

    it('isDisabled=true when has streaming message', () => {
      const sid = makeSessionId('s1');
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: sid, role: 'assistant', content: '', status: 'streaming', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store, connectionStatus: 'ready' }));
      expect(vm.input.isDisabled).toBe(true);
    });
  });

  describe('configError', () => {
    it('is null when configValidation is not provided', () => {
      const vm = buildChatScreenViewModel(baseInput());
      expect(vm.configError).toBeNull();
    });

    it('is null when configValidation is valid', () => {
      const vm = buildChatScreenViewModel(baseInput({
        configValidation: { valid: true, errors: [] },
      }));
      expect(vm.configError).toBeNull();
    });

    it('joins error messages when configValidation is invalid', () => {
      const vm = buildChatScreenViewModel(baseInput({
        configValidation: {
          valid: false,
          errors: [
            { code: 'COMMAND_NOT_FOUND', message: 'cmd not found' },
            { code: 'AGENT_NOT_FOUND', message: 'agent missing' },
          ],
        },
      }));
      expect(vm.configError).toBe('cmd not found; agent missing');
    });

    it('uses connectError when configValidation is valid', () => {
      const vm = buildChatScreenViewModel(baseInput({
        configValidation: { valid: true, errors: [] },
        connectError: 'Spawn error: program not found',
      }));
      expect(vm.configError).toBe('Spawn error: program not found');
    });

    it('prefers configValidation error over connectError', () => {
      const vm = buildChatScreenViewModel(baseInput({
        configValidation: {
          valid: false,
          errors: [{ code: 'COMMAND_NOT_FOUND', message: 'cmd not found' }],
        },
        connectError: 'some other error',
      }));
      expect(vm.configError).toBe('cmd not found');
    });
  });

  describe('sessionId', () => {
    it('is null when no active session', () => {
      const vm = buildChatScreenViewModel(baseInput());
      expect(vm.sessionId).toBeNull();
    });

    it('reflects the active session id', () => {
      const store = makeStoreWithSession('my-session');
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.sessionId).toBe('my-session');
    });
  });
});
