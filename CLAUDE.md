# aimote

AIチャットアプリのクロスプラットフォーム基盤モノレポ。
ドメイン層・状態管理・トランスポート抽象・ホストAPI抽象の共通化が目的。

## 技術スタック

- pnpm 9+ / Node.js 20+ / TypeScript
- Turborepo (ビルドオーケストレーション)
- Vitest (テスト) / ESLint 9 / Prettier
- Tauri v2 (デスクトップアプリ)
- Rust / Cargo workspace (バックエンド: ACP通信、プロセス管理)
- agent-client-protocol v0.10 (ACP SDK)

## パッケージ構成

```
Cargo.toml                    # Rust workspace root
crates/
  aimote-backend/             # 共通 Rust ライブラリ (ACP通信、型定義、transport)
  pc-relay/                   # スタンドアロン WebSocket 中継サーバ (Rust)

apps/
  desktop-tauri/              # Tauri v2 + React デスクトップアプリ
    src-tauri/                # Tauri Rust crate (aimote-backend を利用)

packages/
  shared-types/               # 共通型定義 (ID, Message, AgentEvent, RPC, ConnectionStatus)
  transport/                  # AgentTransport 抽象インターフェース + EventEmitter
  transport-tauri-ipc/        # Tauri IPC アダプタ (invoke/listen で Rust と通信)
  transport-acp-stdio/        # ローカルCLI向け transport (廃止予定、Rust に移行済み)
  transport-relay/            # WebSocket中継 transport (現在mock実装)
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
  event_sink.rs               # EventSink trait (Tauri/WS で異なる実装)
  agent_registry.rs           # AgentConfig + AgentRegistry
  process_manager.rs          # tokio::process でエージェント spawn
  session_update_mapper.rs    # ACP SessionUpdate → Vec<AgentEvent>
  permission_resolver.rs      # oneshot channel ベースの権限解決
  acp_client_handler.rs       # ACP Client trait 実装 (fs, terminal, session)
  acp_transport.rs            # facade: connect/disconnect/session/message
  transport_handle.rs         # Send+Sync ハンドル (LocalSet スレッド + channel actor)
  ws_protocol.rs              # WebSocket メッセージ定義

apps/desktop-tauri/src-tauri
  commands.rs                 # 8つの #[tauri::command]
  state.rs                    # AppState (TransportHandle)
  tauri_event_sink.rs         # TauriEventSink (AppHandle::emit)

crates/pc-relay
  main.rs                     # clap CLI + WebSocket サーバ + TransportHandle
```

## 依存関係

```
shared-types → transport → transport-tauri-ipc (Tauri IPC)
                         → transport-acp-stdio (廃止予定)
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
pnpm test               # vitest (TS側)
pnpm format             # Prettier

# Rust ビルド・テスト
cargo check --workspace
cargo test --workspace
cargo test -p aimote-backend

# デスクトップアプリ起動
cd apps/desktop-tauri && pnpm tauri dev

# pc-relay 起動 (Rust版)
cargo run -p pc-relay -- --port 3001
```

## アーキテクチャ要点

- **AgentTransport**: AI接続の抽象インターフェース。connect/disconnect/startSession/sendUserMessage/cancel/approve/subscribe を定義
- **AgentEvent**: 15種の tagged union (connectionStatus, sessionStarted, messageDelta, messageCompleted, permissionRequested, error, toolCallStarted, toolCallUpdated, plan, thoughtDelta, modeChanged, commandsChanged, usageUpdate, sessionInfoUpdate, turnCompleted)
- **AcpTransport (Rust)**: ACP SDK を使ってCLIエージェントと通信。EventSink trait で Tauri/WebSocket に抽象化
- **TransportHandle**: `!Send` な ACP futures を dedicated LocalSet スレッドで実行し、channel で Send+Sync なインターフェースを提供
- **TauriIpcTransport (TS)**: `@tauri-apps/api` の `invoke()` / `listen()` で Rust 側と通信する薄いアダプタ
- **ChatController**: UI と transport の間を仲介。イベントを受けて ChatStoreManager の状態を更新
- **ChatStoreManager**: 不変更新パターンで sessions と messages を管理
