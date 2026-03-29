import { vi } from 'vitest';
import { BehaviorSubject } from 'rxjs';
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
  getConfigValidation: ReturnType<typeof vi.fn>;
  getConnectError: ReturnType<typeof vi.fn>;
  getActiveSession: ReturnType<typeof vi.fn>;
  getAgentsConfig: ReturnType<typeof vi.fn>;
  saveAgentsConfig: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
}

export function createMockController(
  options: { connectionStatus?: ConnectionStatus } = {},
): MockChatController {
  const { connectionStatus = 'ready' } = options;

  const defaultStore: ChatStore = {
    sessions: new Map(),
    activeSessionId: null,
  };

  const store$ = new BehaviorSubject<ChatStore>(defaultStore);

  const storeManager = {
    getStore: vi.fn(() => store$.getValue()),
    state$: store$.asObservable(),
    subscribe: vi.fn((listener: (store: ChatStore) => void) => {
      const sub = store$.subscribe(listener);
      return () => sub.unsubscribe();
    }),
  };

  const connectionStatus$ = new BehaviorSubject<ConnectionStatus>(connectionStatus);
  const configValidation$ = new BehaviorSubject(null);
  const connectError$ = new BehaviorSubject<string | null>(null);

  return {
    storeManager,
    connectionStatus$,
    configValidation$,
    connectError$,
    connect: vi.fn(async () => {}),
    disconnect: vi.fn(async () => {}),
    startSession: vi.fn(async () => 'session-1' as SessionId),
    sendMessage: vi.fn(async () => {}),
    approve: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    getConnectionStatus: vi.fn(() => connectionStatus$.getValue()),
    getConfigValidation: vi.fn(() => configValidation$.getValue()),
    getConnectError: vi.fn(() => connectError$.getValue()),
    getActiveSession: vi.fn(() => null),
    getAgentsConfig: vi.fn(async () => ({
      defaultAgent: 'claude',
      agents: [{ name: 'claude', command: 'claude', args: [], env: {} }],
    })),
    saveAgentsConfig: vi.fn(async () => {}),
    subscribe: vi.fn((listener: (store: ChatStore) => void) => {
      const sub = store$.subscribe(listener);
      return () => sub.unsubscribe();
    }),
  } as unknown as MockChatController;
}
