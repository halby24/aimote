/**
 * ACP (Agent Client Protocol) 用アプリ側型定義
 *
 * ACP SDK の型をそのまま使うのではなく、アプリ内で使う簡易投影を定義。
 */

// -- Tool Call --

export type ToolCallStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ToolKind = 'read' | 'edit' | 'delete' | 'move' | 'search' | 'execute' | 'think' | 'fetch' | 'switch_mode' | 'other';

export interface ToolCallContentText {
  readonly type: 'text';
  readonly text: string;
}

export interface ToolCallContentDiff {
  readonly type: 'diff';
  readonly path: string;
  readonly oldText?: string;
  readonly newText: string;
}

export interface ToolCallContentTerminal {
  readonly type: 'terminal';
  readonly terminalId: string;
}

export type ToolCallContentItem = ToolCallContentText | ToolCallContentDiff | ToolCallContentTerminal;

export interface ToolCallLocation {
  readonly path: string;
  readonly line?: number;
}

export interface ToolCallInfo {
  readonly toolCallId: string;
  readonly title: string;
  readonly kind?: ToolKind;
  readonly status?: ToolCallStatus;
  readonly content?: readonly ToolCallContentItem[];
  readonly locations?: readonly ToolCallLocation[];
}

export interface ToolCallUpdateInfo {
  readonly toolCallId: string;
  readonly title?: string;
  readonly status?: ToolCallStatus;
  readonly content?: readonly ToolCallContentItem[];
  readonly locations?: readonly ToolCallLocation[];
}

// -- Plan --

export type PlanEntryPriority = 'high' | 'medium' | 'low';
export type PlanEntryStatus = 'pending' | 'in_progress' | 'completed';

export interface PlanEntry {
  readonly content: string;
  readonly priority: PlanEntryPriority;
  readonly status: PlanEntryStatus;
}

// -- Command --

export interface CommandInfo {
  readonly name: string;
  readonly description: string;
  readonly inputHint?: string;
}

// -- Usage --

export interface UsageInfo {
  readonly size: number;
  readonly used: number;
  readonly cost?: { readonly amount: number; readonly currency: string };
}

// -- Permission --

export type PermissionOptionKind = 'allow_once' | 'allow_always' | 'reject_once' | 'reject_always';

export interface PermissionOption {
  readonly optionId: string;
  readonly name: string;
  readonly kind: PermissionOptionKind;
}

export interface PermissionPayload {
  readonly toolCall?: ToolCallUpdateInfo;
  readonly options: readonly PermissionOption[];
}

// -- Stop Reason --

export type StopReason = 'end_turn' | 'max_tokens' | 'max_turn_requests' | 'refusal' | 'cancelled';
