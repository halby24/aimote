# pc-relay

モバイルからつながる WebSocket 中継サーバ。

## 起動

```bash
pnpm build
pnpm start

# 開発モード（ファイル監視）
pnpm dev
```

## API

### HTTP

- `GET /health` — ヘルスチェック

### WebSocket (`ws://host:3001`)

クライアント → サーバ:
```json
{ "type": "startSession" }
{ "type": "sendMessage", "sessionId": "...", "text": "..." }
{ "type": "cancel", "sessionId": "..." }
```

サーバ → クライアント:
```json
{ "type": "connectionStatus", "status": "ready" }
{ "type": "sessionStarted", "sessionId": "..." }
{ "type": "messageDelta", "sessionId": "...", "messageId": "...", "delta": "..." }
{ "type": "messageCompleted", "sessionId": "...", "messageId": "..." }
```
