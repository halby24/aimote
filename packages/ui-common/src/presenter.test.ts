import { describe, it, expect } from 'vitest';
import { buildChatScreenViewModel, type PresenterInput } from './presenter.js';
import type { ChatStore } from '@acme/app-core';
import { makeSessionId, makeMessageId } from '@acme/shared-types';

function makeEmptyStore(): ChatStore {
  return {
    sessions: new Map(),
    activeSessionId: null,
  };
}

function makeStoreWithSession(sessionId: string, messages: Parameters<typeof buildChatScreenViewModel>[0]['store']['sessions'] extends ReadonlyMap<infer _K, infer V> ? V['messages'] : never = []): ChatStore {
  const sid = makeSessionId(sessionId);
  return {
    sessions: new Map([[sid, { id: sid, messages, createdAt: Date.now() }]]),
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
      const store = makeStoreWithSession('s1', [
        { id: mid, sessionId: makeSessionId('s1'), role: 'user', content: 'hi', status: 'completed', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages).toHaveLength(1);
      expect(vm.messages[0]!.content).toBe('hi');
      expect(vm.messages[0]!.role).toBe('user');
    });

    it('sets isStreaming=true for streaming status', () => {
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: makeSessionId('s1'), role: 'assistant', content: 'partial', status: 'streaming', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages[0]!.isStreaming).toBe(true);
    });

    it('sets isError=true for error status', () => {
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: makeSessionId('s1'), role: 'user', content: 'hi', status: 'error', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store }));
      expect(vm.messages[0]!.isError).toBe(true);
    });

    it('sets isCancelled=true for cancelled status', () => {
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: makeSessionId('s1'), role: 'assistant', content: '', status: 'cancelled', createdAt: 0, updatedAt: 0 },
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

    it('isDisabled=true when not connected', () => {
      const vm = buildChatScreenViewModel(baseInput({ connectionStatus: 'idle' }));
      expect(vm.input.isDisabled).toBe(true);
    });

    it('isDisabled=false when connected with no streaming', () => {
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: makeSessionId('s1'), role: 'user', content: 'hi', status: 'completed', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store, connectionStatus: 'ready' }));
      expect(vm.input.isDisabled).toBe(false);
    });

    it('isDisabled=true when connected but has streaming message', () => {
      const store = makeStoreWithSession('s1', [
        { id: makeMessageId('m1'), sessionId: makeSessionId('s1'), role: 'assistant', content: '', status: 'streaming', createdAt: 0, updatedAt: 0 },
      ]);
      const vm = buildChatScreenViewModel(baseInput({ store, connectionStatus: 'ready' }));
      expect(vm.input.isDisabled).toBe(true);
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
