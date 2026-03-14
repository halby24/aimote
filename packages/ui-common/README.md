# @acme/ui-common

`app-core` の状態を UI 向けに整形する Presenter / ViewModel。

UI フレームワークに依存しません。React/ReactUnity 共通で利用できます。

## 主要 API

- `ChatScreenViewModel` — チャット画面全体の状態
- `buildChatScreenViewModel(input)` — ストア状態から ViewModel を構築する pure function
