# desktop-unity

Unity + ReactUnity デスクトップアプリの雛形。

## ディレクトリ構成

```
desktop-unity/
  Assets/
    Scripts/
      Bridge/        # C# ↔ JS ブリッジ実装
      Host/          # Unity 側ホスト API 実装
    UI/
      ReactUnity/    # ReactUnity コンポーネント配置場所
  Packages/          # Unity Package Manager の設定
  ProjectSettings/   # Unity プロジェクト設定
  js-dist/           # JS/TS ビルド成果物の配置先
    aimote-ui.js     # ui-reactunity のバンドル
```

## JS/TS 側との連携

1. `packages/ui-reactunity` でビルドしたバンドルを `js-dist/` に配置する
2. ReactUnity が `js-dist/aimote-ui.js` を読み込む
3. C# Bridge (`Assets/Scripts/Bridge/`) 経由で Unity 側と通信する

## 将来の実装ステップ

1. ReactUnity のセットアップ（Unity Package Manager で追加）
2. `@acme/ui-reactunity` の props を使った ReactUnity コンポーネント実装
3. C# Bridge での `app-core` 相当ロジック実装
4. `AgentTransport` を C# 側で実装し、ローカル AI エージェントと接続

## 注意

現時点では Unity プロジェクト本体は含まれません。
Unity エディタで新規プロジェクトを作成し、このディレクトリ構成に従って配置してください。
