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

  describe('addToolCall', () => {
    it('adds a tool call to the session', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.addToolCall('s1', { toolCallId: 'tc1', title: 'Read file', kind: 'read', status: 'pending' });
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.toolCalls.get('tc1')).toEqual({ toolCallId: 'tc1', title: 'Read file', kind: 'read', status: 'pending' });
    });
  });

  describe('updateToolCall', () => {
    it('merges update into existing tool call', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.addToolCall('s1', { toolCallId: 'tc1', title: 'Read file', kind: 'read', status: 'pending' });
      manager.updateToolCall('s1', 'tc1', { toolCallId: 'tc1', status: 'completed' });
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.toolCalls.get('tc1')!.status).toBe('completed');
      expect(session.toolCalls.get('tc1')!.title).toBe('Read file');
    });

    it('ignores update for non-existent tool call', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const listener = vi.fn();
      manager.subscribe(listener);
      manager.updateToolCall('s1', 'tc-nonexistent', { toolCallId: 'tc-nonexistent', status: 'completed' });
      // updateSession is called but updater returns session unchanged, still notifies
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.toolCalls.size).toBe(0);
    });
  });

  describe('setPlan', () => {
    it('replaces plan entries', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const entries = [{ content: 'Step 1', priority: 'high' as const, status: 'pending' as const }];
      manager.setPlan('s1', entries);
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.plan).toEqual(entries);
    });
  });

  describe('appendThought', () => {
    it('appends to thought string', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.appendThought('s1', 'thinking');
      manager.appendThought('s1', ' more');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.thought).toBe('thinking more');
    });
  });

  describe('setMode', () => {
    it('sets current mode', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.setMode('s1', 'code');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.currentMode).toBe('code');
    });
  });

  describe('setCommands', () => {
    it('replaces available commands', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const commands = [{ name: '/help', description: 'Show help' }];
      manager.setCommands('s1', commands);
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.availableCommands).toEqual(commands);
    });
  });

  describe('setUsage', () => {
    it('sets usage info', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const usage = { size: 100000, used: 5000 };
      manager.setUsage('s1', usage);
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.usage).toEqual(usage);
    });
  });

  describe('setSessionTitle', () => {
    it('sets session title', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.setSessionTitle('s1', 'My Chat');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.title).toBe('My Chat');
    });
  });

  describe('setPermission / clearPermission', () => {
    it('sets and clears pending permission', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const payload = { options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' as const }] };
      manager.setPermission('s1', 'req-1', payload);
      let session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.pendingPermission).toEqual({ requestId: 'req-1', payload });
      manager.clearPermission('s1');
      session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.pendingPermission).toBeNull();
    });
  });

  describe('setTurnActive', () => {
    it('sets isTurnActive and resets thought when deactivating', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.setTurnActive('s1', true);
      manager.appendThought('s1', 'some thought');
      let session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.isTurnActive).toBe(true);
      expect(session.thought).toBe('some thought');
      manager.setTurnActive('s1', false);
      session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.isTurnActive).toBe(false);
      expect(session.thought).toBe('');
    });
  });

  describe('addErrorMessage', () => {
    it('adds a system error message', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      manager.addErrorMessage('s1', 'ERR_001', 'Something failed');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.messages).toHaveLength(1);
      const msg = session.messages[0]!;
      expect(msg.role).toBe('system');
      expect(msg.content).toBe('[ERR_001] Something failed');
      expect(msg.status).toBe('error');
    });
  });

  describe('createSession defaults', () => {
    it('initializes all new fields with defaults', () => {
      const manager = new ChatStoreManager();
      manager.createSession('s1');
      const session = manager.getStore().sessions.get(makeSessionId('s1'))!;
      expect(session.toolCalls.size).toBe(0);
      expect(session.plan).toEqual([]);
      expect(session.thought).toBe('');
      expect(session.currentMode).toBeNull();
      expect(session.availableCommands).toEqual([]);
      expect(session.usage).toBeNull();
      expect(session.title).toBeNull();
      expect(session.pendingPermission).toBeNull();
      expect(session.isTurnActive).toBe(false);
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
