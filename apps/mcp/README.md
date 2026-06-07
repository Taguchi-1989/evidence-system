# @evidence/mcp — MCP サーバ

成果・証跡管理システムの REST API を、AI エージェント（Claude Desktop / Claude Code / 各種 MCP 対応クライアント）の
**ツール**として公開する MCP サーバ。stdio トランスポートで動作します。

## 公開ツール

| ツール | 内容 |
| --- | --- |
| `list_submissions` | 年度の成果一覧（scope/status 絞り込み） |
| `get_submission` | 提出IDで詳細取得 |
| `get_stats` | 年度の集計 |
| `get_policy` | 運用モード・ポリシー |
| `run_audit` | 監査Agent 実行（参考判定） |
| `export_submissions_json` | 年度の全成果を JSON(§16.2) で取得 |
| `approve_submission` | 提出を承認（**要 reviewer 権限**） |
| `reject_submission` | 提出を差戻し（**要 reviewer 権限**） |
| `comment_submission` | 確認者コメントを記録（**要 reviewer 権限**） |

> 書き込み系（承認/差戻し/コメント）は、API 側 `AGENT_API_ROLE` が承認可能ロール
> （`office` / `admin` / 担当上長 `manager`）のときのみ成功します。読み取りのみで運用する場合は
> 既定の `office` でも閲覧/集計/エクスポート/監査実行が可能です。

## 認証・接続

API の `AGENT_API_KEYS` に登録したキーを環境変数で渡します。

```bash
EVIDENCE_API_BASE_URL=http://localhost:8787 \
EVIDENCE_AGENT_API_KEY=<your-agent-key> \
pnpm --filter @evidence/mcp start
```

## クライアント設定例（Claude Desktop 等）

`mcpServers` に追加：

```json
{
  "mcpServers": {
    "evidence-system": {
      "command": "pnpm",
      "args": ["--filter", "@evidence/mcp", "start"],
      "cwd": "/absolute/path/to/Evidence_system",
      "env": {
        "EVIDENCE_API_BASE_URL": "http://localhost:8787",
        "EVIDENCE_AGENT_API_KEY": "<your-agent-key>"
      }
    }
  }
}
```

> 付与ロールは API 側の `AGENT_API_ROLE` で決まります。**既定は `auditor`＝read系のみ**（セキュアデフォルト）。
> `export_submissions_json` / `run_audit` / 書き込み系を使うには `AGENT_API_ROLE=office`（または `admin`）が必要です。
> 本番では実 API URL と Secrets を使用してください。REST 詳細は [docs/api.md](../../docs/api.md)。
