import type { Observable } from 'rxjs';
import type { AgentEvent, AgentsFile, ConfigValidationResult } from '@acme/shared-types';
import type { AgentTransport, SessionListItem } from '@acme/transport';
import { createEventBus, ConnectionError } from '@acme/transport';

export interface WsTransportOptions {
  /** WebSocket server URL, e.g. "ws://localhost:3001" */
  url: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * AgentTransport implementation over WebSocket.
 *
 * Protocol:
 * - Client sends JSON messages with `{ type, ...fields }` and optional `reqId`
 *   for request-reply correlation.
 * - Server sends two kinds of messages:
 *   - Push events (AgentEvent): no `reqId` field → dispatched to subscribers.
 *   - Replies: has `reqId` field → resolves the matching pending request.
 */
export class WsTransport implements AgentTransport {
  private readonly bus = createEventBus();
  readonly events$: Observable<AgentEvent> = this.bus.events$;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly url: string;
  private readonly timeout: number;
  private ws: WebSocket | null = null;
  private connectingPromise: Promise<void> | null = null;
  private reqCounter = 0;

  constructor(options: WsTransportOptions) {
    this.url = options.url;
    this.timeout = options.timeout ?? 30_000;
  }

  async connect(): Promise<void> {
    await this.ensureOpen();
    await this.sendRequest({ type: 'connect' });
  }

  async disconnect(): Promise<void> {
    // Only send the disconnect message if we actually have an open connection.
    // Avoids ensureOpen() opening a NEW socket just to send 'disconnect'.
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        await this.sendRequest({ type: 'disconnect' });
      } finally {
        this.close();
      }
    } else {
      this.close();
    }
  }

  async startSession(
    input?: { workspace?: string },
  ): Promise<{ sessionId: string }> {
    const reply = (await this.sendRequest({
      type: 'startSession',
      workspace: input?.workspace ?? null,
    })) as { sessionId: string };
    return { sessionId: reply.sessionId };
  }

  async sendUserMessage(sessionId: string, text: string): Promise<void> {
    // Fire-and-forget — no reqId needed, but we use one to detect errors.
    await this.sendRequest({ type: 'sendMessage', sessionId, text });
  }

  async cancel(sessionId: string): Promise<void> {
    await this.sendRequest({ type: 'cancel', sessionId });
  }

  async approve(requestId: string, optionId: string): Promise<void> {
    await this.sendRequest({ type: 'approve', requestId, optionId });
  }

  async validateConfig(): Promise<ConfigValidationResult> {
    const reply = (await this.sendRequest({
      type: 'validateConfig',
    })) as { result: ConfigValidationResult };
    return reply.result;
  }

  async listSessions(): Promise<{ sessions: SessionListItem[] }> {
    const reply = (await this.sendRequest({
      type: 'listSessions',
    })) as { sessions: SessionListItem[] };
    return { sessions: reply.sessions };
  }

  async loadSession(sessionId: string): Promise<void> {
    await this.sendRequest({ type: 'loadSession', sessionId });
  }

  async getAgentsConfig(): Promise<AgentsFile> {
    const reply = (await this.sendRequest({
      type: 'getAgentsConfig',
    })) as { config: AgentsFile };
    return reply.config;
  }

  async saveAgentsConfig(config: AgentsFile): Promise<void> {
    await this.sendRequest({ type: 'saveAgentsConfig', config });
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  private ensureOpen(): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }
    // Deduplicate concurrent ensureOpen calls — return the same promise
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    this.connectingPromise = new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.url);

      ws.onopen = () => {
        this.ws = ws;
        this.connectingPromise = null;
        resolve();
      };

      ws.onerror = () => {
        this.connectingPromise = null;
        reject(new ConnectionError('WebSocket connection failed'));
      };

      ws.onclose = () => {
        this.connectingPromise = null;
        this.handleClose();
      };

      ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(String(event.data));
      };
    });
    return this.connectingPromise;
  }

  private handleMessage(data: string): void {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(data) as Record<string, unknown>;
    } catch {
      return;
    }

    // Discriminate: if `reqId` is present, it's a reply; otherwise a push event.
    if ('reqId' in parsed && typeof parsed['reqId'] === 'string') {
      const reqId = parsed['reqId'] as string;
      const pending = this.pending.get(reqId);
      if (!pending) return;
      this.pending.delete(reqId);
      clearTimeout(pending.timer);

      if (parsed['type'] === 'error') {
        pending.reject(
          new Error(
            `${parsed['code'] ?? 'ERROR'}: ${parsed['message'] ?? 'Unknown error'}`,
          ),
        );
      } else {
        pending.resolve(parsed);
      }
    } else {
      // Push event — forward to subscribers
      this.bus.subject.next(parsed as unknown as AgentEvent);
    }
  }

  private handleClose(): void {
    this.ws = null;
    // Reject all pending requests
    for (const [, pending] of this.pending) {
      clearTimeout(pending.timer);
      pending.reject(new ConnectionError('WebSocket closed'));
    }
    this.pending.clear();
  }

  private close(): void {
    this.connectingPromise = null;
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.handleClose();
    }
  }

  private async sendRequest(message: Record<string, unknown>): Promise<unknown> {
    await this.ensureOpen();

    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new ConnectionError('WebSocket not connected'));
        return;
      }

      const reqId = `r${++this.reqCounter}`;
      const timer = setTimeout(() => {
        this.pending.delete(reqId);
        reject(new Error(`Request ${reqId} timed out`));
      }, this.timeout);

      this.pending.set(reqId, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ ...message, reqId }));
    });
  }
}
