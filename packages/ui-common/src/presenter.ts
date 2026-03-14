import type { ChatStore } from '@acme/app-core';
import type { ConnectionStatus, ChatMessage } from '@acme/shared-types';
import type { ChatScreenViewModel, MessageViewModel, ChatInputViewModel } from './view-models.js';

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

export interface PresenterInput {
  store: ChatStore;
  connectionStatus: ConnectionStatus;
  inputValue: string;
  isSubmitting: boolean;
}

export function buildChatScreenViewModel(input: PresenterInput): ChatScreenViewModel {
  const { store, connectionStatus, inputValue, isSubmitting } = input;
  const activeSession = store.activeSessionId
    ? store.sessions.get(store.activeSessionId)
    : null;

  const messages: MessageViewModel[] = activeSession
    ? activeSession.messages.map(toMessageViewModel)
    : [];

  const isConnected = connectionStatus === 'ready';
  const hasStreamingMessage = messages.some((m) => m.isStreaming);

  const chatInput: ChatInputViewModel = {
    value: inputValue,
    isDisabled: !isConnected || hasStreamingMessage,
    isSubmitting,
  };

  return {
    messages,
    input: chatInput,
    connectionStatus,
    isConnected,
    sessionId: store.activeSessionId ?? null,
  };
}
