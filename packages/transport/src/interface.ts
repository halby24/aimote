import type { AgentEvent, AgentsFile, ConfigValidationResult } from '@acme/shared-types';

export interface SessionListItem {
  sessionId: string;
  title?: string;
  cwd?: string;
  updatedAt?: string;
}

export interface AgentTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startSession(input?: { workspace?: string }): Promise<{ sessionId: string }>;
  sendUserMessage(sessionId: string, text: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  approve(requestId: string, optionId: string): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): () => void;

  // Optional — capability dependent
  validateConfig?(): Promise<ConfigValidationResult>;
  listSessions?(): Promise<{ sessions: SessionListItem[] }>;
  loadSession?(sessionId: string): Promise<void>;
  getAgentsConfig?(): Promise<AgentsFile>;
  saveAgentsConfig?(config: AgentsFile): Promise<void>;
}
