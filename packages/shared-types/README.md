# @acme/shared-types

共通 DTO・イベント型・RPC 型・ID 型など、パッケージ間で共有する純粋な TypeScript 型定義集。

## 主要エクスポート

- `SessionId`, `MessageId`, `RequestId` — ブランド型 ID
- `ConnectionStatus` — 接続状態
- `ChatMessage` — チャットメッセージ DTO
- `AgentEvent` — トランスポートイベント判別共用体
- `RpcRequest`, `RpcResponse` — 将来の RPC 向け型
- `AppConfig` — アプリ設定
