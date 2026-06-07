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

> 付与ロールは API 側の `AGENT_API_ROLE` で決まります（既定 office＝全社read＋export）。
> 本番では実 API URL と Secrets を使用してください。REST 詳細は [docs/api.md](../../docs/api.md)。
