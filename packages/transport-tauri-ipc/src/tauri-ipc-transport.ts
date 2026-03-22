import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { AgentTransport, SessionListItem } from '@acme/transport';
import type { AgentEvent, ConfigValidationResult } from '@acme/shared-types';

export class TauriIpcTransport implements AgentTransport {
  private listeners = new Set<(event: AgentEvent) => void>();
  private unlisten: UnlistenFn | null = null;

  async connect(): Promise<void> {
    // Set up event listener before connecting
    if (!this.unlisten) {
      this.unlisten = await listen<AgentEvent>('agent-event', (event) => {
        for (const listener of this.listeners) {
          listener(event.payload);
        }
      });
    }
    await invoke('connect');
  }

  async disconnect(): Promise<void> {
    await invoke('disconnect');
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
  }

  async startSession(input?: { workspace?: string }): Promise<{ sessionId: string }> {
    const sessionId = await invoke<string>('start_session', {
      workspace: input?.workspace ?? null,
    });
    return { sessionId };
  }

  async sendUserMessage(sessionId: string, text: string): Promise<void> {
    await invoke('send_user_message', { sessionId, text });
  }

  async cancel(sessionId: string): Promise<void> {
    await invoke('cancel_session', { sessionId });
  }

  async approve(requestId: string, optionId: string): Promise<void> {
    await invoke('approve_permission', { requestId, optionId });
  }

  subscribe(listener: (event: AgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async validateConfig(): Promise<ConfigValidationResult> {
    return invoke<ConfigValidationResult>('validate_config');
  }

  async listSessions(): Promise<{ sessions: SessionListItem[] }> {
    const sessions = await invoke<SessionListItem[]>('list_sessions');
    return { sessions };
  }

  async loadSession(sessionId: string): Promise<void> {
    await invoke('load_session', { sessionId });
  }
}
