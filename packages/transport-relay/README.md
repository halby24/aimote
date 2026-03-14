# @acme/transport-relay

WebSocket 中継サーバ向けの `AgentTransport` 実装。

現時点では Mock 実装です。`transport-acp-stdio` と同じ `AgentTransport` 契約に従います。

## 使い方

```ts
import { RelayMockTransport } from '@acme/transport-relay';

const transport = new RelayMockTransport({ url: 'ws://192.168.1.1:3001' });
await transport.connect();
```
