import type {
  ChatMessage,
  SessionId,
  MessageId,
  RequestId,
  ToolCallInfo,
  ToolCallUpdateInfo,
  PlanEntry,
  CommandInfo,
  UsageInfo,
  PermissionPayload,
} from '@acme/shared-types';
import { makeMessageId, makeSessionId, makeRequestId } from '@acme/shared-types';

export interface PendingPermission {
  readonly requestId: RequestId;
  readonly payload: PermissionPayload;
}

export interface ChatSession {
  readonly id: SessionId;
  readonly messages: readonly ChatMessage[];
  readonly createdAt: number;
  readonly toolCalls: ReadonlyMap<string, ToolCallInfo>;
  readonly plan: readonly PlanEntry[];
  readonly thought: string;
  readonly currentMode: string | null;
  readonly availableCommands: readonly CommandInfo[];
  readonly usage: UsageInfo | null;
  readonly title: string | null;
  readonly pendingPermission: PendingPermission | null;
  readonly isTurnActive: boolean;
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
      toolCalls: new Map(),
      plan: [],
      thought: '',
      currentMode: null,
      availableCommands: [],
      usage: null,
      title: null,
      pendingPermission: null,
      isTurnActive: false,
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

  addToolCall(sessionId: string, toolCall: ToolCallInfo): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => {
      const newToolCalls = new Map(session.toolCalls);
      newToolCalls.set(toolCall.toolCallId, toolCall);
      return { ...session, toolCalls: newToolCalls };
    });
  }

  updateToolCall(sessionId: string, toolCallId: string, update: ToolCallUpdateInfo): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => {
      const existing = session.toolCalls.get(toolCallId);
      if (!existing) return session;
      const newToolCalls = new Map(session.toolCalls);
      newToolCalls.set(toolCallId, { ...existing, ...update });
      return { ...session, toolCalls: newToolCalls };
    });
  }

  setPlan(sessionId: string, entries: readonly PlanEntry[]): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, plan: entries }));
  }

  appendThought(sessionId: string, delta: string): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, thought: session.thought + delta }));
  }

  setMode(sessionId: string, modeId: string): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, currentMode: modeId }));
  }

  setCommands(sessionId: string, commands: readonly CommandInfo[]): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, availableCommands: commands }));
  }

  setUsage(sessionId: string, usage: UsageInfo): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, usage }));
  }

  setSessionTitle(sessionId: string, title: string): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, title }));
  }

  setPermission(sessionId: string, requestId: string, payload: PermissionPayload): void {
    const sid = makeSessionId(sessionId);
    const rid = makeRequestId(requestId);
    this.updateSession(sid, (session) => ({
      ...session,
      pendingPermission: { requestId: rid, payload },
    }));
  }

  clearPermission(sessionId: string): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({ ...session, pendingPermission: null }));
  }

  setTurnActive(sessionId: string, active: boolean): void {
    const sid = makeSessionId(sessionId);
    this.updateSession(sid, (session) => ({
      ...session,
      isTurnActive: active,
      thought: active ? session.thought : '',
    }));
  }

  addErrorMessage(sessionId: string, code: string, message: string): void {
    const sid = makeSessionId(sessionId);
    const messageId = makeMessageId(`error-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const errorMsg: ChatMessage = {
      id: messageId,
      sessionId: sid,
      role: 'system',
      content: `[${code}] ${message}`,
      status: 'error',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.updateSession(sid, (session) => ({
      ...session,
      messages: [...session.messages, errorMsg],
    }));
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
