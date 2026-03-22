import { vi } from 'vitest';
import type { ChatController } from '@acme/app-core';
import type { ChatStore } from '@acme/app-core';
import type { ConnectionStatus, SessionId } from '@acme/shared-types';

export interface MockChatController extends ChatController {
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  startSession: ReturnType<typeof vi.fn>;
  sendMessage: ReturnType<typeof vi.fn>;
  approve: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  getConnectionStatus: ReturnType<typeof vi.fn>;
  getActiveSession: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

export function createMockController(
  options: { connectionStatus?: ConnectionStatus } = {},
): MockChatController {
  const { connectionStatus = 'ready' } = options;
  const listeners = new Set<(store: ChatStore) => void>();

  const defaultStore: ChatStore = {
    sessions: new Map(),
    activeSessionId: null,
  };

  const storeManager = {
    getStore: vi.fn(() => defaultStore),
    subscribe: vi.fn((listener: (store: ChatStore) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  };

  return {
    storeManager,
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    startSession: vi.fn(async () => 'session-1' as SessionId),
    sendMessage: vi.fn(async () => {}),
    approve: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    getConnectionStatus: vi.fn(() => connectionStatus),
    getActiveSession: vi.fn(() => null),
    subscribe: vi.fn((listener: (store: ChatStore) => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
  } as unknown as MockChatController;
}
