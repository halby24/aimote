# CLAUDE.md

## ローカルCI実行

`actrun` を使って GitHub Actions ワークフローをローカル実行できる。

```bash
actrun workflow run .github/workflows/ci.yml --worktree --skip-action 'actions/setup-node@v4'
```

**注意:** `actions/setup-node@v4` の `cache: 'pnpm'` を actrun がサポートしていないため、`--skip-action` でスキップが必要。
