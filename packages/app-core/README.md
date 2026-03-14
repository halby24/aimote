# @acme/app-core

チャットセッションとメッセージを管理するアプリケーションコア。

React 非依存の純粋 TypeScript 実装です。

## 主要 API

### ChatController

`AgentTransport` を注入して利用します。

```ts
import { ChatController } from '@acme/app-core';
import { AcpStdioMockTransport } from '@acme/transport-acp-stdio';

const controller = new ChatController({
  transport: new AcpStdioMockTransport(),
});

await controller.connect();
const sessionId = await controller.startSession();
await controller.sendMessage('Hello!');
```

### ChatStoreManager

購読可能なストアです。

```ts
const unsubscribe = controller.subscribe((store) => {
  console.log(store.sessions);
});
```
