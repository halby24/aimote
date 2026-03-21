import type { MessageId, RequestId, SessionId } from './ids.js';
import type { ConnectionStatus } from './connection.js';
import type {
  ToolCallInfo,
  ToolCallUpdateInfo,
  PlanEntry,
  CommandInfo,
  UsageInfo,
  PermissionPayload,
  StopReason,
} from './acp-types.js';

export type AgentEvent =
  | { type: 'connectionStatus'; status: ConnectionStatus }
  | { type: 'sessionStarted'; sessionId: SessionId }
  | { type: 'messageDelta'; sessionId: SessionId; messageId: MessageId; delta: string }
  | { type: 'messageCompleted'; sessionId: SessionId; messageId: MessageId }
  | { type: 'permissionRequested'; sessionId: SessionId; requestId: RequestId; payload: PermissionPayload }
  | { type: 'error'; code: string; message: string }
  // ACP 拡張イベント
  | { type: 'toolCallStarted'; sessionId: SessionId; toolCall: ToolCallInfo }
  | { type: 'toolCallUpdated'; sessionId: SessionId; toolCallId: string; update: ToolCallUpdateInfo }
  | { type: 'plan'; sessionId: SessionId; entries: readonly PlanEntry[] }
  | { type: 'thoughtDelta'; sessionId: SessionId; delta: string }
  | { type: 'modeChanged'; sessionId: SessionId; modeId: string }
  | { type: 'commandsChanged'; sessionId: SessionId; commands: readonly CommandInfo[] }
  | { type: 'usageUpdate'; sessionId: SessionId; usage: UsageInfo }
  | { type: 'sessionInfoUpdate'; sessionId: SessionId; title?: string | null }
  | { type: 'turnCompleted'; sessionId: SessionId; stopReason: StopReason };
