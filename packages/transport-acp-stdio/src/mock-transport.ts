import type { AgentTransport } from '@acme/transport';
import { EventEmitter } from '@acme/transport';
import { makeSessionId, makeMessageId } from '@acme/shared-types';

const MOCK_RESPONSES = [
  'こんにちは！何かお手伝いできることはありますか？',
  'ご質問ありがとうございます。詳しくお聞かせいただけますか？',
  'なるほど、それについて説明しますね。',
  'AIアシスタントとしてお答えします。',
];

export class AcpStdioMockTransport implements AgentTransport {
  private readonly emitter = new EventEmitter();
  private connected = false;
  private sessionCounter = 0;
  private messageCounter = 0;

  async connect(): Promise<void> {
    this.emitter.emit({ type: 'connectionStatus', status: 'connecting' });
    await delay(100);
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
    const sessionId = makeSessionId(`session-${++this.sessionCounter}`);
    await delay(50);
    this.emitter.emit({ type: 'sessionStarted', sessionId });
    return { sessionId };
  }

  async sendUserMessage(sessionId: string, text: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');
    void text;
    const messageId = makeMessageId(`msg-${++this.messageCounter}`);
    const response = MOCK_RESPONSES[this.messageCounter % MOCK_RESPONSES.length] ?? MOCK_RESPONSES[0]!;
    
    // Simulate streaming response
    void this.streamResponse(sessionId, messageId, response);
  }

  private async streamResponse(sessionId: string, messageId: string, text: string): Promise<void> {
    const chunks = splitIntoChunks(text, 3);
    for (const chunk of chunks) {
      await delay(80);
      this.emitter.emit({
        type: 'messageDelta',
        sessionId: makeSessionId(sessionId),
        messageId: makeMessageId(messageId),
        delta: chunk,
      });
    }
    await delay(50);
    this.emitter.emit({
      type: 'messageCompleted',
      sessionId: makeSessionId(sessionId),
      messageId: makeMessageId(messageId),
    });
  }

  async cancel(sessionId: string): Promise<void> {
    void sessionId;
    // Mock: no-op
  }

  async approve(requestId: string, optionId: string): Promise<void> {
    void requestId;
    void optionId;
    // Mock: no-op
  }

  subscribe(listener: (event: import('@acme/shared-types').AgentEvent) => void): () => void {
    return this.emitter.subscribe(listener);
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
