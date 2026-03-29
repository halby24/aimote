import type { Observable } from 'rxjs';
import type { AgentTransport, SessionListItem } from '@acme/transport';
import { createEventBus } from '@acme/transport';
import { makeSessionId } from '@acme/shared-types';
import type { AgentEvent } from '@acme/shared-types';
import type { Stream } from '@agentclientprotocol/sdk/dist/stream.js';
import { ClientSideConnection } from '@agentclientprotocol/sdk/dist/acp.js';
import type { AgentCapabilities, InitializeResponse } from '@agentclientprotocol/sdk/dist/acp.js';
import { AcpClientHandler } from './acp-client-handler.js';
import { PermissionResolver } from './permission-resolver.js';
import { spawnAgent, type SpawnResult } from './process-manager.js';
import type { ProcessManagerOptions } from './process-manager.js';
import type { AgentRegistry } from './agent-registry.js';

export interface AcpStdioTransportOptions {
  agentName: string;
  registry: AgentRegistry;
  cwd?: string;
  processManagerOptions?: ProcessManagerOptions;
}

export class AcpStdioTransport implements AgentTransport {
  private readonly bus = createEventBus();
  readonly events$: Observable<AgentEvent> = this.bus.events$;
  private readonly permissionResolver = new PermissionResolver();
  private connection: ClientSideConnection | null = null;
  private spawnResult: SpawnResult | null = null;
  private agentCapabilities: AgentCapabilities | null = null;
  private readonly options: AcpStdioTransportOptions;

  constructor(options: AcpStdioTransportOptions) {
    this.options = options;
  }

  /** @internal For testing — connect using a pre-built stream instead of spawning a process. */
  async connectWithStream(stream: Stream): Promise<void> {
    this.bus.subject.next({ type: 'connectionStatus', status: 'connecting' });

    const clientHandler = new AcpClientHandler(this.bus.subject, this.permissionResolver);
    this.connection = new ClientSideConnection(
      () => clientHandler,
      stream,
    );

    try {
      const initResponse: InitializeResponse = await this.connection.initialize({
        clientInfo: { name: 'aimote', version: '0.0.1' },
        capabilities: {
          fs: { readTextFile: true, writeTextFile: true },
          terminal: true,
        },
        protocolVersion: 1,
      });

      this.agentCapabilities = initResponse.agentCapabilities ?? null;
      this.bus.subject.next({ type: 'connectionStatus', status: 'ready' });
    } catch (err) {
      this.bus.subject.next({
        type: 'error',
        code: 'INIT_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
      this.bus.subject.next({ type: 'connectionStatus', status: 'error' });
      throw err;
    }
  }

  async connect(): Promise<void> {
    const config = this.options.registry.get(this.options.agentName);
    if (!config) {
      this.bus.subject.next({
        type: 'error',
        code: 'AGENT_NOT_FOUND',
        message: `Agent "${this.options.agentName}" not found in registry`,
      });
      throw new Error(`Agent "${this.options.agentName}" not found in registry`);
    }

    this.bus.subject.next({ type: 'connectionStatus', status: 'connecting' });

    try {
      this.spawnResult = spawnAgent(config, this.options.processManagerOptions);
    } catch (err) {
      this.bus.subject.next({
        type: 'error',
        code: 'SPAWN_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
      this.bus.subject.next({ type: 'connectionStatus', status: 'error' });
      throw err;
    }

    const clientHandler = new AcpClientHandler(this.bus.subject, this.permissionResolver);

    this.connection = new ClientSideConnection(
      () => clientHandler,
      this.spawnResult.stream,
    );

    // Monitor process exit
    void this.spawnResult.exitPromise.then(
      () => {
        this.bus.subject.next({ type: 'connectionStatus', status: 'disconnected' });
      },
      (err) => {
        this.bus.subject.next({
          type: 'error',
          code: 'PROCESS_CRASH',
          message: err instanceof Error ? err.message : String(err),
        });
        this.bus.subject.next({ type: 'connectionStatus', status: 'disconnected' });
      },
    );

    try {
      const initResponse: InitializeResponse = await this.connection.initialize({
        clientInfo: { name: 'aimote', version: '0.0.1' },
        capabilities: {
          fs: { readTextFile: true, writeTextFile: true },
          terminal: true,
        },
        protocolVersion: 1,
      });

      this.agentCapabilities = initResponse.agentCapabilities ?? null;
      this.bus.subject.next({ type: 'connectionStatus', status: 'ready' });
    } catch (err) {
      this.bus.subject.next({
        type: 'error',
        code: 'INIT_ERROR',
        message: err instanceof Error ? err.message : String(err),
      });
      this.bus.subject.next({ type: 'connectionStatus', status: 'error' });
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    this.permissionResolver.cancelAll();
    if (this.spawnResult) {
      this.spawnResult.kill();
      this.spawnResult = null;
    }
    this.connection = null;
    this.agentCapabilities = null;
    this.bus.subject.next({ type: 'connectionStatus', status: 'disconnected' });
  }

  async startSession(input?: { workspace?: string }): Promise<{ sessionId: string }> {
    if (!this.connection) throw new Error('Not connected');

    const response = await this.connection.newSession({
      cwd: input?.workspace ?? this.options.cwd ?? process.cwd(),
      mcpServers: [],
    });

    const sessionId = response.sessionId;
    this.bus.subject.next({ type: 'sessionStarted', sessionId: makeSessionId(sessionId) });
    return { sessionId };
  }

  async sendUserMessage(sessionId: string, text: string): Promise<void> {
    if (!this.connection) throw new Error('Not connected');

    const response = await this.connection.prompt({
      sessionId,
      prompt: [{ type: 'text', text }],
    });

    this.bus.subject.next({
      type: 'turnCompleted',
      sessionId: makeSessionId(sessionId),
      stopReason: response.stopReason,
    });
  }

  async cancel(sessionId: string): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    await this.connection.cancel({ sessionId });
  }

  async approve(requestId: string, optionId: string): Promise<void> {
    this.permissionResolver.resolve(requestId, optionId);
  }

  async listSessions(): Promise<{ sessions: SessionListItem[] }> {
    if (!this.connection) throw new Error('Not connected');
    if (!this.agentCapabilities?.sessionCapabilities?.list) {
      throw new Error('Agent does not support session listing');
    }

    const response = await this.connection.listSessions({});
    return {
      sessions: response.sessions.map((s: { sessionId: string; cwd: string; title?: string | null; updatedAt?: string | null }) => ({
        sessionId: s.sessionId,
        cwd: s.cwd,
        ...(s.title != null && { title: s.title }),
        ...(s.updatedAt != null && { updatedAt: s.updatedAt }),
      })),
    };
  }

  async loadSession(sessionId: string): Promise<void> {
    if (!this.connection) throw new Error('Not connected');
    if (!this.agentCapabilities?.loadSession) {
      throw new Error('Agent does not support session loading');
    }

    await this.connection.loadSession({ sessionId });
  }
}
