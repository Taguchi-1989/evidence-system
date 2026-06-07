/**
 * MCP サーバ：成果・証跡管理システムの REST API を AI エージェント向けツールとして公開。
 * stdio トランスポート。認証は APIキー（EVIDENCE_AGENT_API_KEY → API の AGENT_API_KEYS と一致）。
 *
 * 起動例: EVIDENCE_API_BASE_URL=http://localhost:8787 EVIDENCE_AGENT_API_KEY=xxx pnpm --filter @evidence/mcp start
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const BASE = process.env.EVIDENCE_API_BASE_URL ?? 'http://localhost:8787';
const KEY = process.env.EVIDENCE_AGENT_API_KEY ?? '';

async function api(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(KEY ? { authorization: `Bearer ${KEY}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`API ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

const ok = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});
const qs = (p: Record<string, string | undefined>) => {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : '';
};

const server = new McpServer({ name: 'evidence-system', version: '0.1.0' });

server.tool(
  'list_submissions',
  '年度の提出（成果）一覧を取得する。scope=all で全社、status で絞り込み。',
  { fiscalYear: z.string(), scope: z.string().optional(), status: z.string().optional() },
  async ({ fiscalYear, scope, status }) =>
    ok(await api(`/submissions${qs({ fiscalYear, scope: scope ?? 'all', status })}`)),
);

server.tool(
  'get_submission',
  '提出IDで1件の成果の詳細を取得する。',
  { submissionId: z.string() },
  async ({ submissionId }) => ok(await api(`/submissions/${submissionId}`)),
);

server.tool(
  'get_stats',
  '年度の集計（提出状況・証跡状況・影響度/貢献度別など）を取得する。',
  { fiscalYear: z.string() },
  async ({ fiscalYear }) => ok(await api(`/admin/stats${qs({ fiscalYear })}`)),
);

server.tool(
  'get_policy',
  '年度の有効な運用モード・ポリシーを取得する。',
  { fiscalYear: z.string() },
  async ({ fiscalYear }) => ok(await api(`/config/policy${qs({ fiscalYear })}`)),
);

server.tool(
  'run_audit',
  '監査Agentを実行し、証跡の一次チェック結果を生成する（参考判定）。',
  { fiscalYear: z.string(), submissionId: z.string().optional() },
  async ({ fiscalYear, submissionId }) =>
    ok(
      await api('/admin/audit/run', {
        method: 'POST',
        body: JSON.stringify({ fiscalYear, ...(submissionId ? { submissionId } : {}) }),
      }),
    ),
);

server.tool(
  'export_submissions_json',
  '年度の全成果を JSON(schemaVersion 1.0) でエクスポートし、その内容を返す。',
  { fiscalYear: z.string() },
  async ({ fiscalYear }) => {
    const job = (await api('/admin/export', {
      method: 'POST',
      body: JSON.stringify({ fiscalYear, format: 'json' }),
    })) as { exportJobId: string };
    const dl = (await api(`/admin/export/${job.exportJobId}/download`)) as { url: string };
    const res = await fetch(dl.url);
    return ok(await res.json());
  },
);

// ── 書き込み系（要 reviewer 権限：AGENT_API_ROLE=office/admin/manager）──
server.tool(
  'approve_submission',
  '提出を承認する。AGENT_API_ROLE が承認可能ロール（office/admin/担当上長）である必要がある。',
  { submissionId: z.string(), comment: z.string().optional() },
  async ({ submissionId, comment }) =>
    ok(
      await api(`/submissions/${submissionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comment: comment ?? '' }),
      }),
    ),
);

server.tool(
  'reject_submission',
  '提出を差戻しする。要 reviewer 権限。',
  { submissionId: z.string(), comment: z.string().optional() },
  async ({ submissionId, comment }) =>
    ok(
      await api(`/submissions/${submissionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ comment: comment ?? '' }),
      }),
    ),
);

server.tool(
  'comment_submission',
  '提出に確認者コメントを記録する。要 reviewer 権限。',
  { submissionId: z.string(), comment: z.string() },
  async ({ submissionId, comment }) =>
    ok(
      await api(`/submissions/${submissionId}/comment`, {
        method: 'POST',
        body: JSON.stringify({ comment }),
      }),
    ),
);

const transport = new StdioServerTransport();
await server.connect(transport);
// stderr に出すと stdio プロトコルを汚さない
console.error(`[evidence-mcp] connected. API=${BASE} auth=${KEY ? 'apikey' : 'none'}`);
