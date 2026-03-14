import type { MessageId, SessionId } from './ids.js';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus =
  | 'sending'
  | 'streaming'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface ChatMessage {
  readonly id: MessageId;
  readonly sessionId: SessionId;
  readonly role: MessageRole;
  readonly content: string;
  readonly status: MessageStatus;
  readonly createdAt: number;
  readonly updatedAt: number;
}
