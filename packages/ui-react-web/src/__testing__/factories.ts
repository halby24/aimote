import type {
  ChatScreenViewModel,
  MessageViewModel,
  ChatInputViewModel,
  ToolCallViewModel,
  PlanViewModel,
  PermissionViewModel,
  UsageViewModel,
} from '@acme/ui-common';
import type { MessageId } from '@acme/shared-types';

export function createMessageViewModel(
  overrides: Partial<MessageViewModel> = {},
): MessageViewModel {
  return {
    id: 'msg-1' as MessageId,
    role: 'user',
    content: 'Hello',
    isStreaming: false,
    isError: false,
    isCancelled: false,
    ...overrides,
  };
}

export function createInputViewModel(
  overrides: Partial<ChatInputViewModel> = {},
): ChatInputViewModel {
  return {
    value: '',
    isDisabled: false,
    isSubmitting: false,
    ...overrides,
  };
}

export function createToolCallViewModel(
  overrides: Partial<ToolCallViewModel> = {},
): ToolCallViewModel {
  return {
    toolCallId: 'tc-1',
    title: 'Read file',
    kind: 'read',
    status: 'in_progress',
    isActive: true,
    ...overrides,
  };
}

export function createPlanViewModel(
  overrides: Partial<PlanViewModel> = {},
): PlanViewModel {
  return {
    entries: [],
    hasEntries: false,
    ...overrides,
  };
}

export function createPermissionViewModel(
  overrides: Partial<PermissionViewModel> = {},
): PermissionViewModel {
  return {
    requestId: 'perm-1',
    description: 'Allow file write',
    options: [
      { optionId: 'allow', name: '許可', kind: 'allow_once' },
      { optionId: 'deny', name: '拒否', kind: 'reject_once' },
    ],
    ...overrides,
  };
}

export function createUsageViewModel(
  overrides: Partial<UsageViewModel> = {},
): UsageViewModel {
  return {
    used: 5000,
    total: 10000,
    percentage: 50,
    costDisplay: null,
    ...overrides,
  };
}

export function createChatScreenViewModel(
  overrides: Partial<ChatScreenViewModel> = {},
): ChatScreenViewModel {
  return {
    messages: [],
    input: createInputViewModel(),
    connectionStatus: 'ready',
    isConnected: true,
    sessionId: 'session-1',
    toolCalls: [],
    plan: createPlanViewModel(),
    thought: '',
    currentMode: null,
    availableCommands: [],
    usage: null,
    title: null,
    pendingPermission: null,
    isTurnActive: false,
    configError: null,
    ...overrides,
  };
}
