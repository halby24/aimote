# @acme/transport

`AgentTransport` 抽象インターフェースとトランスポート共通ユーティリティ。

## 主要エクスポート

- `AgentTransport` — 全 transport 実装が満たすべきインターフェース
- `TransportError`, `ConnectionError`, `SessionError`, `MessageError` — エラー型
- `EventEmitter` — イベント購読ユーティリティ

## AgentTransport API

```ts
interface AgentTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startSession(input?: { workspace?: string }): Promise<{ sessionId: string }>;
  sendUserMessage(sessionId: string, text: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
  approve(requestId: string, decision: 'allow' | 'deny'): Promise<void>;
  subscribe(listener: (event: AgentEvent) => void): () => void;
}
```
