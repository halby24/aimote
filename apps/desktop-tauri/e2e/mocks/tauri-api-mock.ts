/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Mock for @tauri-apps/api/core and @tauri-apps/api/event
 * Used during E2E testing (VITE_E2E=1) to replace real Tauri IPC.
 */

declare global {
  interface Window {
    __tauriMock: TauriMock;
  }
}

interface TauriMock {
  invokeHandlers: Map<string, (...args: any[]) => any>;
  eventListeners: Map<string, Set<(event: { payload: any }) => void>>;
  emitEvent: (eventName: string, payload: any) => void;
}

function getTauriMock(): TauriMock {
  if (!window.__tauriMock) {
    window.__tauriMock = {
      invokeHandlers: new Map(),
      eventListeners: new Map(),
      emitEvent(eventName: string, payload: any) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
          for (const listener of listeners) {
            listener({ payload });
          }
        }
      },
    };
  }
  return window.__tauriMock;
}

// @tauri-apps/api/core exports
export async function invoke(cmd: string, args?: any): Promise<any> {
  const mock = getTauriMock();
  const handler = mock.invokeHandlers.get(cmd);
  if (handler) {
    return handler(args);
  }
  console.warn(`[tauri-mock] No handler for invoke("${cmd}")`, args);
  return undefined;
}

// @tauri-apps/api/event exports
export type UnlistenFn = () => void;

export async function listen(
  eventName: string,
  callback: (event: { payload: any }) => void,
): Promise<UnlistenFn> {
  const mock = getTauriMock();
  if (!mock.eventListeners.has(eventName)) {
    mock.eventListeners.set(eventName, new Set());
  }
  mock.eventListeners.get(eventName)!.add(callback);
  return () => {
    mock.eventListeners.get(eventName)?.delete(callback);
  };
}

export async function emit(_eventName: string, _payload?: any): Promise<void> {
  // No-op for now
}

// Initialize on load
getTauriMock();
