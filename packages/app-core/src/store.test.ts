import { describe, it, expect, vi } from 'vitest';
import { ChatStoreManager } from './store.js';
import { makeSessionId } from '@acme/shared-types';

describe('ChatStoreManager', () => {
  describe('initial state', () => {
    it('has empty sessions and no active session', () => {
      const manager = new ChatStoreManager();
      const store = manager.getStore();
      expect(store.sessions.size).toBe(0);
      expect(store.activeSessionId).toBeNull();
    });
  });

  describe('createSession', () => {
    it('creates a session and sets it as active', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const store = manager.getStore();
      expect(store.sessions.has(makeSessionId('s1'))).toBe(true);
      expect(store.activeSessionId).toBe('s1');
    });

    it('creates multiple sessions independently', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.createSession('s2');
      expect(manager.getStore().sessions.size).toBe(2);
    });

    it('notifies listeners', () => {
      const manager = new ChatStoreManager();
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.createSession('s1');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('addUserMessage', () => {
    it('adds a user message with sending status and returns its id', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const msgId = manager.addUserMessage('s1', 'hello');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.messages).toHaveLength(1);
      const msg = session.messages[0]!;
      expect(msg.role).toBe('user');
      expect(msg.content).toBe('hello');
      expect(msg.status).toBe('sending');
      expect(msg.id).toBe(msgId);
    });

    it('notifies listeners', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.addUserMessage('s1', 'hello');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('addAssistantMessage', () => {
    it('adds an assistant message with streaming status and empty content', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.addAssistantMessage('s1', 'assist-1');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      const msg = session.messages[0]!;
      expect(msg.role).toBe('assistant');
      expect(msg.content).toBe('');
      expect(msg.status).toBe('streaming');
      expect(msg.id).toBe('assist-1');
    });
  });

  describe('appendMessageDelta', () => {
    it('appends content to an assistant message', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.addAssistantMessage('s1', 'assist-1');
      manager.appendMessageDelta('s1', 'assist-1', 'hello');
      manager.appendMessageDelta('s1', 'assist-1', ' world');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.messages[0]!.content).toBe('hello world');
    });
  });

  describe('completeMessage', () => {
    it('sets message status to completed', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.addAssistantMessage('s1', 'assist-1');
      manager.completeMessage('s1', 'assist-1');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.messages[0]!.status).toBe('completed');
    });
  });

  describe('markMessageSent', () => {
    it('sets user message status to completed', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const msgId = manager.addUserMessage('s1', 'hi');
      manager.markMessageSent('s1', msgId);
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.messages[0]!.status).toBe('completed');
    });
  });

  describe('markMessageError', () => {
    it('sets user message status to error', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const msgId = manager.addUserMessage('s1', 'hi');
      manager.markMessageError('s1', msgId);
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.messages[0]!.status).toBe('error');
    });
  });

  describe('setActiveSession', () => {
    it('changes the active session', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.createSession('s2');
      manager.setActiveSession('s1');
      expect(manager.getStore().activeSessionId).toBe('s1');
    });

    it('sets null when passed null', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.setActiveSession(null);
      expect(manager.getStore().activeSessionId).toBeNull();
    });

    it('notifies listeners', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.setActiveSession('s1');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('subscribe', () => {
    it('calls listener on each mutation', () => {
      const manager = new ChatStoreManager();
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.createSession('s1');
      manager.addUserMessage('s1', 'hello');
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('unsubscribe stops notifications', () => {
      const manager = new ChatStoreManager();
      const listener = vi.fn();
      const unsubscribe = manager.subscribe(listener);
      unsubscribe();
      manager.createSession('s1');
      expect(listener).not.toHaveBeenCalled();
    });

    it('listener receives the updated store', () => {
      const manager = new ChatStoreManager();
      let received: unknown;
      manager.subscribe((store) => {
        received = store;
      });
      manager.createSession('s1');
      expect((received as ReturnType<typeof manager.getStore>).activeSessionId).toBe('s1');
    });
  });
});
