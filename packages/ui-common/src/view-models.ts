import type { MessageId } from '@acme/shared-types';
import type { ToolKind, ToolCallStatus, PlanEntry, PermissionOption } from '@acme/shared-types';

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

export interface ToolCallViewModel {
  readonly toolCallId: string;
  readonly title: string;
  readonly kind: ToolKind | undefined;
  readonly status: ToolCallStatus | undefined;
  readonly isActive: boolean;
}

export interface PlanViewModel {
  readonly entries: readonly PlanEntry[];
  readonly hasEntries: boolean;
}

export interface PermissionViewModel {
  readonly requestId: string;
  readonly description: string;
  readonly options: readonly PermissionOption[];
}

export interface UsageViewModel {
  readonly used: number;
  readonly total: number;
  readonly percentage: number;
  readonly costDisplay: string | null;
}

export interface ChatScreenViewModel {
  readonly messages: readonly MessageViewModel[];
  readonly input: ChatInputViewModel;
  readonly connectionStatus: import('@acme/shared-types').ConnectionStatus;
  readonly isConnected: boolean;
  readonly sessionId: string | null;
  readonly toolCalls: readonly ToolCallViewModel[];
  readonly plan: PlanViewModel;
  readonly thought: string;
  readonly currentMode: string | null;
  readonly availableCommands: readonly import('@acme/shared-types').CommandInfo[];
  readonly usage: UsageViewModel | null;
  readonly title: string | null;
  readonly pendingPermission: PermissionViewModel | null;
  readonly isTurnActive: boolean;
}
