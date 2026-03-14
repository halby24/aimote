import type { MessageId } from '@acme/shared-types';

export interface MessageViewModel {
  readonly id: MessageId;
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly isStreaming: boolean;
  readonly isError: boolean;
  readonly isCancelled: boolean;
}

export interface ChatInputViewModel {
  readonly value: string;
  readonly isDisabled: boolean;
  readonly isSubmitting: boolean;
}

export interface ChatScreenViewModel {
  readonly messages: readonly MessageViewModel[];
  readonly input: ChatInputViewModel;
  readonly connectionStatus: import('@acme/shared-types').ConnectionStatus;
  readonly isConnected: boolean;
  readonly sessionId: string | null;
}
