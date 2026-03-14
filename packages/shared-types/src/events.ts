import type { MessageId, RequestId, SessionId } from './ids.js';
import type { ConnectionStatus } from './connection.js';

export type AgentEvent =
  | { type: 'connectionStatus'; status: ConnectionStatus }
  | { type: 'sessionStarted'; sessionId: SessionId }
  | { type: 'messageDelta'; sessionId: SessionId; messageId: MessageId; delta: string }
  | { type: 'messageCompleted'; sessionId: SessionId; messageId: MessageId }
  | { type: 'permissionRequested'; sessionId: SessionId; requestId: RequestId; payload: unknown }
  | { type: 'error'; code: string; message: string };
