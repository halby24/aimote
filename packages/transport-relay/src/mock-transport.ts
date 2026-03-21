import type { AgentTransport } from '@acme/transport';
import { EventEmitter } from '@acme/transport';
import { makeSessionId, makeMessageId } from '@acme/shared-types';

export interface RelayTransportOptions {
  url?: string;
}

export class RelayMockTransport implements AgentTransport {
  private readonly emitter = new EventEmitter();
  private readonly url: string;
  private connected = false;
  private sessionCounter = 0;
  private messageCounter = 0;

  constructor(options: RelayTransportOptions = {}) {
    this.url = options.url ?? 'ws://localhost:3001';
  }

  async connect(): Promise<void> {
    this.emitter.emit({ type: 'connectionStatus', status: 'connecting' });
    await delay(150);
    // Mock: pretend WebSocket connection succeeded
    this.connected = true;
    this.emitter.emit({ type: 'connectionStatus', status: 'ready' });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.emitter.emit({ type: 'connectionStatus', status: 'disconnected' });
    this.emitter.clear();
  }

  async startSession(input?: { workspace?: string }): Promise<{ sessionId: string }> {
    if (!this.connected) throw new Error('Not connected');
    void input;
    const sessionId = makeSessionId(`relay-session-${++this.sessionCounter}`);
    await delay(50);
    this.emitter.emit({ type: 'sessionStarted', sessionId });
    return { sessionId };
  }

  async sendUserMessage(sessionId: string, text: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');
    void text;
    const messageId = makeMessageId(`relay-msg-${++this.messageCounter}`);
    void this.streamResponse(sessionId, messageId, `[Relay] ${text} への応答です。`);
  }

  private async streamResponse(sessionId: string, messageId: string, text: string): Promise<void> {
    const chunks = splitIntoChunks(text, 4);
    for (const chunk of chunks) {
      await delay(100);
      this.emitter.emit({
        type: 'messageDelta',
        sessionId: makeSessionId(sessionId),
        messageId: makeMessageId(messageId),
        delta: chunk,
      });
    }
    await delay(60);
    this.emitter.emit({
      type: 'messageCompleted',
      sessionId: makeSessionId(sessionId),
      messageId: makeMessageId(messageId),
    });
  }

  async cancel(sessionId: string): Promise<void> {
    void sessionId;
  }

  async approve(requestId: string, optionId: string): Promise<void> {
    void requestId;
    void optionId;
  }

  subscribe(listener: (event: import('@acme/shared-types').AgentEvent) => void): () => void {
    return this.emitter.subscribe(listener);
  }

  getUrl(): string {
    return this.url;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function splitIntoChunks(text: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += size) {
    chunks.push(text.slice(i, i + size));
  }
  return chunks;
}
