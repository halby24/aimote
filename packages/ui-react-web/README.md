# @acme/ui-react-web

React DOM 向け UI コンポーネント。

`app-core` + `ui-common` + transport mock を使って動くチャット画面を提供します。

## コンポーネント

- `ChatScreen` — チャット画面全体（接続・セッション管理含む）
- `MessageList` — メッセージ一覧
- `MessageInput` — テキスト入力エリア

## 使い方

```tsx
import { ChatScreen } from '@acme/ui-react-web';
import { ChatController } from '@acme/app-core';
import { AcpStdioMockTransport } from '@acme/transport-acp-stdio';

const controller = new ChatController({
  transport: new AcpStdioMockTransport(),
});

function App() {
  return <ChatScreen controller={controller} />;
}
```
