# aimote

AI チャットアプリのクロスプラットフォーム基盤 モノレポ

## 構成の意図

このモノレポはUIの完全共通化ではなく、**ドメイン層・状態管理・トランスポート抽象・ホストAPI抽象** の共通化を目的としています。

```
repo/
  apps/
    desktop-tauri/    # Tauri v2 + React デスクトップアプリ
    desktop-unity/    # Unity + ReactUnity（将来）
    pc-relay/         # モバイル向け中継WebSocketサーバ
  packages/
    shared-types/     # 共通DTO・イベント型・RPC型
    transport/        # AgentTransport 抽象インターフェース
    transport-acp-stdio/  # ローカルCLI向けmock transport
    transport-relay/      # WebSocket中継mock transport
    app-core/         # チャットセッション・メッセージ管理（React非依存）
    host-api/         # ファイル選択・クリップボード等の抽象API
    host-api-tauri/   # Tauri向けhost-api実装
    ui-common/        # ViewModel/Presenter（フレームワーク非依存）
    ui-react-web/     # React DOM向けUIコンポーネント
    ui-reactunity/    # ReactUnity向けUI契約・props定義
```

## 依存関係（循環なし）

```
shared-types
  └─ transport
       ├─ transport-acp-stdio
       ├─ transport-relay
       └─ app-core
            └─ ui-common
                 └─ ui-react-web
```

## 起動方法

### 前提条件

- Node.js 20+
- pnpm 9+

### セットアップ

```bash
pnpm install
pnpm build
```

### デスクトップアプリ起動（Tauri）

```bash
cd apps/desktop-tauri
pnpm tauri dev
```

### 中継サーバ起動

```bash
cd apps/pc-relay
pnpm dev
```

## 開発コマンド

| コマンド | 内容 |
|---------|------|
| `pnpm build` | 全パッケージビルド |
| `pnpm lint` | ESLint実行 |
| `pnpm typecheck` | 型チェック |
| `pnpm test` | テスト実行 |
| `pnpm format` | Prettier整形 |