# desktop-tauri

Tauri v2 + React デスクトップアプリ。

## 起動

```bash
# フロントエンドのみ（Tauri なし）
pnpm dev

# Tauri アプリとして起動（Rust環境が必要）
pnpm tauri dev
```

## 構成

- フロントエンド: React + Vite
- `@acme/ui-react-web` — UI コンポーネント
- `@acme/transport-acp-stdio` — mock transport
- `@acme/host-api-tauri` — Tauri ホスト API（将来差し込み）
