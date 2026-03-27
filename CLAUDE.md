# aimote

AIチャットアプリのクロスプラットフォーム基盤モノレポ。
ドメイン層・状態管理・トランスポート抽象・ホストAPI抽象の共通化が目的。

## 技術スタック

- pnpm 9+ / Node.js 20+ / TypeScript
- Turborepo (ビルドオーケストレーション)
- Vitest (テスト) / ESLint 9 / Prettier
- Tauri v2 (デスクトップアプリ)
- Rust / Cargo workspace (バックエンド: ACP通信、プロセス管理、WebSocketサーバ)
- agent-client-protocol v0.10 (ACP SDK)

## パッケージ構成

```
Cargo.toml                    # Rust workspace root
crates/
  aimote-backend/             # 共通 Rust ライブラリ (ACP通信、型定義、WS サーバ)
  pc-relay/                   # スタンドアロン WebSocket 中継サーバ CLI (Rust)

apps/
  desktop-tauri/              # Tauri v2 + React デスクトップアプリ
    src-tauri/                # Tauri Rust crate (ws_server をインプロセス起動)

packages/
  shared-types/               # 共通型定義 (ID, Message, AgentEvent, RPC, ConnectionStatus)
  transport/                  # AgentTransport 抽象インターフェース + EventEmitter
  transport-ws/               # WebSocket transport (全フロントエンド共通)
  transport-acp-stdio/        # ローカルCLI向け transport (廃止予定、Rust に移行済み)
  app-core/                   # ChatController + ChatStoreManager (React非依存)
  host-api/                   # ファイル選択・クリップボード等の抽象API
  host-api-tauri/             # Tauri向け host-api 実装
  ui-common/                  # ViewModel/Presenter (フレームワーク非依存)
  ui-react-web/               # React DOM向け UIコンポーネント
  ui-reactunity/              # ReactUnity向け UI契約・props定義
```

## Rust crate 構成

```
aimote-backend (lib)
  types.rs                    # AgentEvent enum (#[serde(tag="type")]) + 補助型
  event_sink.rs               # EventSink trait
  agent_registry.rs           # AgentConfig + AgentRegistry
  process_manager.rs          # tokio::process でエージェント spawn
  session_update_mapper.rs    # ACP SessionUpdate → Vec<AgentEvent>
  permission_resolver.rs      # oneshot channel ベースの権限解決
  acp_client_handler.rs       # ACP Client trait 実装 (fs, terminal, session)
  acp_transport.rs            # facade: connect/disconnect/session/message
  transport_handle.rs         # Send+Sync ハンドル (LocalSet スレッド + channel actor)
  ws_protocol.rs              # WebSocket プロトコル定義 (WsEnvelope, WsReply, WsReplyBody)
  ws_server.rs                # WebSocket サーバ (start_ws_server, 接続ハンドリング)
  agent_config_file.rs        # agents.json の読み書き
  config_validator.rs         # エージェントコマンドの PATH 検証

apps/desktop-tauri/src-tauri
  lib.rs                      # Tauri setup (ws_server をインプロセス起動、ポートを webview に注入)

crates/pc-relay
  main.rs                     # clap CLI → ws_server::start_ws_server() を呼ぶだけの薄いラッパー
```

## 依存関係

```
shared-types → transport → transport-ws (WebSocket, 全フロントエンド共通)
                         → transport-acp-stdio (廃止予定)
                         → app-core → ui-common → ui-react-web
shared-types → host-api → host-api-tauri
```

## 通信アーキテクチャ

全フロントエンド (Tauri webview, ReactUnity, 将来のクライアント) が同じ
`transport-ws` パッケージを使って WebSocket 経由でバックエンドと通信する。

```
フロントエンド (TS)
  → WsTransport (transport-ws)
    → WebSocket (localhost)
      → ws_server (aimote-backend)
        → TransportHandle → AcpTransport → エージェントプロセス
```

- **Tauri**: lib.rs で ws_server をインプロセス起動 (ポート 0 → OS 割当)、
  `window.__AIMOTE_WS_PORT__` で webview にポート通知
- **ReactUnity**: pc-relay を別プロセスで起動し、WsTransport で接続
- **WS プロトコル**: reqId ベースの request-reply + AgentEvent push の二重構造

## 開発コマンド

```bash
pnpm install            # 依存関係インストール
pnpm build              # 全パッケージビルド (turbo)
pnpm lint               # ESLint
pnpm typecheck          # 型チェック
pnpm test               # vitest (TS側)
pnpm format             # Prettier

# Rust ビルド・テスト
cargo check --workspace
cargo test --workspace
cargo test -p aimote-backend

# デスクトップアプリ起動
cd apps/desktop-tauri && pnpm tauri dev

# pc-relay 起動 (Rust版、ReactUnity 等の外部クライアント向け)
cargo run -p pc-relay -- --port 3001

# ReactUnity向けバンドル (esbuild → Unity UPMパッケージへ出力)
pnpm --filter @acme/ui-reactunity run build:unity
# 出力先: unity-packages/com.acme.aimote-ui/Runtime/Resources/react/index.js
# ※ tsc (pnpm build) だけでは Unity に反映されない。UI変更後は必ず build:unity を実行
```

## アーキテクチャ要点

- **AgentTransport**: AI接続の抽象インターフェース。connect/disconnect/startSession/sendUserMessage/cancel/approve/subscribe + optional メソッド (validateConfig, listSessions, loadSession, getAgentsConfig, saveAgentsConfig)
- **AgentEvent**: 15種の tagged union (connectionStatus, sessionStarted, messageDelta, messageCompleted, permissionRequested, error, toolCallStarted, toolCallUpdated, plan, thoughtDelta, modeChanged, commandsChanged, usageUpdate, sessionInfoUpdate, turnCompleted)
- **AcpTransport (Rust)**: ACP SDK を使ってCLIエージェントと通信
- **TransportHandle**: `!Send` な ACP futures を dedicated LocalSet スレッドで実行し、channel で Send+Sync なインターフェースを提供
- **WsTransport (TS)**: WebSocket 経由で ws_server と通信。reqId による request-reply + EventEmitter による push イベント配信
- **ws_server (Rust)**: TransportHandle をラップする WebSocket サーバ。Tauri にインプロセス埋め込み、または pc-relay でスタンドアロン起動
- **ChatController**: UI と transport の間を仲介。イベントを受けて ChatStoreManager の状態を更新
- **ChatStoreManager**: 不変更新パターンで sessions と messages を管理
