import type { ChatMessage, SessionId, MessageId } from '@acme/shared-types';
import { makeMessageId, makeSessionId } from '@acme/shared-types';

export interface ChatSession {
  readonly id: SessionId;
  readonly messages: readonly ChatMessage[];
  readonly createdAt: number;
}

export interface ChatStore {
  readonly sessions: ReadonlyMap<SessionId, ChatSession>;
  readonly activeSessionId: SessionId | null;
}

export type StoreListener = (store: ChatStore) => void;

function createStore(): ChatStore {
  return {
    sessions: new Map(),
    activeSessionId: null,
  };
}

export class ChatStoreManager {
  private store: ChatStore = createStore();
  private readonly listeners = new Set<StoreListener>();

  getStore(): ChatStore {
    return this.store;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.store);
    }
  }

  createSession(sessionId: string): void {
    const id = makeSessionId(sessionId);
    const session: ChatSession = {
      id,
      messages: [],
      createdAt: Date.now(),
    };
    const newSessions = new Map(this.store.sessions);
    newSessions.set(id, session);
    this.store = { ...this.store, sessions: newSessions, activeSessionId: id };
    this.notify();
  }

  addUserMessage(sessionId: string, text: string): MessageId {
    const sid = makeSessionId(sessionId);
    const messageId = makeMessageId(`user-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const message: ChatMessage = {
      id: messageId,
      sessionId: sid,
      role: 'user',
      content: text,
      status: 'sending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.updateSession(sid, (session) => ({
      ...session,
      messages: [...session.messages, message],
    }));
    return messageId;
  }

  addAssistantMessage(sessionId: string, messageId: string): void {
    const sid = makeSessionId(sessionId);
    const mid = makeMessageId(messageId);
    const message: ChatMessage = {
      id: mid,
      sessionId: sid,
      role: 'assistant',
      content: '',
      status: 'streaming',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.updateSession(sid, (session) => ({
      ...session,
      messages: [...session.messages, message],
    }));
  }

  appendMessageDelta(sessionId: string, messageId: string, delta: string): void {
    const sid = makeSessionId(sessionId);
    const mid = makeMessageId(messageId);
    this.updateMessage(sid, mid, (msg) => ({
      ...msg,
      content: msg.content + delta,
      updatedAt: Date.now(),
    }));
  }

  completeMessage(sessionId: string, messageId: string): void {
    const sid = makeSessionId(sessionId);
    const mid = makeMessageId(messageId);
    this.updateMessage(sid, mid, (msg) => ({
      ...msg,
      status: 'completed' as const,
      updatedAt: Date.now(),
    }));
  }

  markMessageSent(sessionId: string, messageId: MessageId): void {
    const sid = makeSessionId(sessionId);
    this.updateMessage(sid, messageId, (msg) => ({
      ...msg,
      status: 'completed' as const,
      updatedAt: Date.now(),
    }));
  }

  markMessageError(sessionId: string, messageId: MessageId): void {
    const sid = makeSessionId(sessionId);
    this.updateMessage(sid, messageId, (msg) => ({
      ...msg,
      status: 'error' as const,
      updatedAt: Date.now(),
    }));
  }

  setActiveSession(sessionId: string | null): void {
    this.store = {
      ...this.store,
      activeSessionId: sessionId ? makeSessionId(sessionId) : null,
    };
    this.notify();
  }

  private updateSession(id: SessionId, updater: (s: ChatSession) => ChatSession): void {
    const existing = this.store.sessions.get(id);
    if (!existing) return;
    const newSessions = new Map(this.store.sessions);
    newSessions.set(id, updater(existing));
    this.store = { ...this.store, sessions: newSessions };
    this.notify();
  }

  private updateMessage(
    sessionId: SessionId,
    messageId: MessageId,
    updater: (m: ChatMessage) => ChatMessage,
  ): void {
    this.updateSession(sessionId, (session) => ({
      ...session,
      messages: session.messages.map((m) => (m.id === messageId ? updater(m) : m)),
    }));
  }
}
