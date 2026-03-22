import type { ChatStore, ChatSession } from '@acme/app-core';
import type { ConnectionStatus, ChatMessage, ToolCallInfo, ConfigValidationResult } from '@acme/shared-types';
import type {
  ChatScreenViewModel,
  MessageViewModel,
  ChatInputViewModel,
  ToolCallViewModel,
  PlanViewModel,
  PermissionViewModel,
  UsageViewModel,
} from './view-models.js';

function toMessageViewModel(msg: ChatMessage): MessageViewModel {
  return {
    id: msg.id,
    role: msg.role,
    content: msg.content,
    isStreaming: msg.status === 'streaming',
    isError: msg.status === 'error',
    isCancelled: msg.status === 'cancelled',
  };
}

function toToolCallViewModel(tc: ToolCallInfo): ToolCallViewModel {
  return {
    toolCallId: tc.toolCallId,
    title: tc.title,
    kind: tc.kind,
    status: tc.status,
    isActive: tc.status === 'pending' || tc.status === 'in_progress',
  };
}

function toPlanViewModel(session: ChatSession | null): PlanViewModel {
  const entries = session?.plan ?? [];
  return { entries, hasEntries: entries.length > 0 };
}

function toPermissionViewModel(session: ChatSession | null): PermissionViewModel | null {
  const perm = session?.pendingPermission;
  if (!perm) return null;
  const description = perm.payload.toolCall?.title ?? 'Permission requested';
  return {
    requestId: perm.requestId,
    description,
    options: perm.payload.options,
  };
}

function toUsageViewModel(session: ChatSession | null): UsageViewModel | null {
  const usage = session?.usage;
  if (!usage) return null;
  const total = usage.size;
  const used = usage.used;
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
  const costDisplay = usage.cost
    ? `${usage.cost.currency} ${usage.cost.amount.toFixed(2)}`
    : null;
  return { used, total, percentage, costDisplay };
}

export interface PresenterInput {
  store: ChatStore;
  connectionStatus: ConnectionStatus;
  inputValue: string;
  isSubmitting: boolean;
  configValidation?: ConfigValidationResult | null;
  connectError?: string | null;
}

export function buildChatScreenViewModel(input: PresenterInput): ChatScreenViewModel {
  const { store, connectionStatus, inputValue, isSubmitting, configValidation, connectError } = input;
  const activeSession = store.activeSessionId
    ? store.sessions.get(store.activeSessionId)
    : null;

  const messages: MessageViewModel[] = activeSession
    ? activeSession.messages.map(toMessageViewModel)
    : [];

  const isConnected = connectionStatus === 'ready';
  const hasStreamingMessage = messages.some((m) => m.isStreaming);
  const hasPendingPermission = activeSession?.pendingPermission != null;

  const chatInput: ChatInputViewModel = {
    value: inputValue,
    isDisabled: !isConnected || hasStreamingMessage || hasPendingPermission,
    isSubmitting,
  };

  const toolCalls: ToolCallViewModel[] = activeSession
    ? Array.from(activeSession.toolCalls.values()).map(toToolCallViewModel)
    : [];

  return {
    messages,
    input: chatInput,
    connectionStatus,
    isConnected,
    sessionId: store.activeSessionId ?? null,
    toolCalls,
    plan: toPlanViewModel(activeSession ?? null),
    thought: activeSession?.thought ?? '',
    currentMode: activeSession?.currentMode ?? null,
    availableCommands: activeSession?.availableCommands ?? [],
    usage: toUsageViewModel(activeSession ?? null),
    title: activeSession?.title ?? null,
    pendingPermission: toPermissionViewModel(activeSession ?? null),
    isTurnActive: activeSession?.isTurnActive ?? false,
    configError:
      configValidation && !configValidation.valid
        ? configValidation.errors.map((e) => e.message).join('; ')
        : connectError ?? null,
  };
}
