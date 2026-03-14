# @acme/transport-acp-stdio

ローカル CLI プロセス (ACP stdio) 向けの `AgentTransport` 実装。

現時点では Mock 実装です。疑似ストリーミングで assistant の返答を分割配信します。

## 使い方

```ts
import { AcpStdioMockTransport } from '@acme/transport-acp-stdio';

const transport = new AcpStdioMockTransport();
await transport.connect();
const { sessionId } = await transport.startSession();
```
