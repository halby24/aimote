# aimote

AIチャットアプリのクロスプラットフォーム基盤モノレポ。
ドメイン層・状態管理・トランスポート抽象・ホストAPI抽象の共通化が目的。

## 技術スタック

- pnpm 9+ / Node.js 20+ / TypeScript
- Turborepo (ビルドオーケストレーション)
- Vitest (テスト) / ESLint 9 / Prettier
- Tauri v2 (デスクトップアプリ)

## パッケージ構成

```
apps/
  desktop-tauri/        # Tauri v2 + React デスクトップアプリ
  pc-relay/             # モバイル向けWebSocket中継サーバ (port 3001)

packages/
  shared-types/         # 共通型定義 (ID, Message, AgentEvent, RPC, ConnectionStatus)
  transport/            # AgentTransport 抽象インターフェース + EventEmitter
  transport-acp-stdio/  # ローカルCLI向け transport (現在mock実装)
  transport-relay/      # WebSocket中継 transport (現在mock実装)
  app-core/             # ChatController + ChatStoreManager (React非依存)
  host-api/             # ファイル選択・クリップボード等の抽象API
  host-api-tauri/       # Tauri向け host-api 実装
  ui-common/            # ViewModel/Presenter (フレームワーク非依存)
  ui-react-web/         # React DOM向け UIコンポーネント
  ui-reactunity/        # ReactUnity向け UI契約・props定義
```

## 依存関係

```
shared-types → transport → transport-acp-stdio
                         → transport-relay
                         → app-core → ui-common → ui-react-web
shared-types → host-api → host-api-tauri
```

## 開発コマンド

```bash
pnpm install            # 依存関係インストール
pnpm build              # 全パッケージビルド (turbo)
pnpm lint               # ESLint
pnpm typecheck          # 型チェック
pnpm test               # vitest
pnpm format             # Prettier

# デスクトップアプリ起動
cd apps/desktop-tauri && pnpm tauri dev

# 中継サーバ起動
cd apps/pc-relay && pnpm build && pnpm dev
```

## アーキテクチャ要点

- **AgentTransport**: AI接続の抽象インターフェース。connect/disconnect/startSession/sendUserMessage/cancel/approve/subscribe を定義
- **AgentEvent**: connectionStatus / sessionStarted / messageDelta / messageCompleted / permissionRequested / error の6種
- **ChatController**: UI と transport の間を仲介。イベントを受けて ChatStoreManager の状態を更新
- **ChatStoreManager**: 不変更新パターンで sessions と messages を管理
- **現状**: transport 実装は全て mock。実際のAI API接続は未実装
