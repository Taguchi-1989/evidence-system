/**
 * ローカル統合テスト（Docker不要・GitHub Actions不要）。`pnpm --filter @evidence/api test:e2e:local`
 * STORAGE_DRIVER=local の一時データで、Hono アプリを in-process（app.request）で叩き、
 * 提出→証跡(presign/PUT/confirm/download)→提出→承認→監査→エクスポート を通しで検証する。
 */
import { rmSync } from 'node:fs';
import { ExportDocumentSchema } from '@evidence/shared';

// ── 設定はモジュール読込前に確定する（config が import 時に env を読むため）──
const TMP = '.verify-data';
process.env.STORAGE_DRIVER = 'local';
process.env.LOCAL_DATA_DIR = TMP;
process.env.AUTH_PROVIDER = 'mock';
process.env.NODE_ENV = 'test';
process.env.AGENT_API_KEYS = 'e2e-agent-key'; // 外部Agent APIキー認証の検証用
rmSync(TMP, { recursive: true, force: true }); // まっさらから開始

const { seedAll } = await import('../src/seed.js');
const { createApp } = await import('../src/app.js');

const app = createApp();

let passed = 0;
function assert(cond: unknown, msg: string): void {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  passed++;
  console.log(`  ✓ ${msg}`);
}

interface ReqOpts {
  token?: string;
  json?: unknown;
  raw?: string;
  contentType?: string;
}
async function req(method: string, path: string, opts: ReqOpts = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers['authorization'] = `Bearer ${opts.token}`;
  let body: string | undefined;
  if (opts.json !== undefined) {
    headers['content-type'] = 'application/json';
    body = JSON.stringify(opts.json);
  } else if (opts.raw !== undefined) {
    headers['content-type'] = opts.contentType ?? 'text/plain';
    body = opts.raw;
  }
  const res = await app.request(path, { method, headers, body });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }
  return { status: res.status, ok: res.ok, data: data as any, text };
}

const pathOf = (url: string) => {
  const u = new URL(url);
  return u.pathname + u.search;
};

async function main(): Promise<void> {
  await seedAll({ quiet: true });

  // 1) ログイン（一般入力者）
  const login = await req('POST', '/auth/login', { json: { userId: 'user-001' } });
  assert(login.ok && login.data.token, 'contributor がログインできる');
  const token = login.data.token as string;
  assert(login.data.user.role === 'contributor', 'ロールが contributor');

  // 2) /auth/me
  const me = await req('GET', '/auth/me', { token });
  assert(me.ok && me.data.userId === 'user-001', '/auth/me が本人を返す');

  // 3) 自分の提出一覧（seed 分）
  const myList = await req('GET', '/submissions?scope=me&fiscalYear=2026', { token });
  assert(myList.ok && myList.data.items.length >= 2, '自分の提出が一覧に出る');

  // 4) 新規作成（下書き）
  const created = await req('POST', '/submissions', {
    token,
    json: {
      fiscalYear: '2026',
      departmentId: 'dept-002',
      userName: '田中 太郎',
      title: '統合テスト：自動検証の整備',
      achievementText: 'ローカル統合テストで全フローを自動検証できるようにした。',
      impactLevelSelf: 3,
      contributionLevelSelf: 4,
      evidencePresence: 'AVAILABLE',
    },
  });
  assert(created.status === 201 && created.data.submissionId, '提出を新規作成できる');
  const sid = created.data.submissionId as string;

  // 5) 証跡 presign（local は API URL を返す）
  const presign = await req('POST', `/submissions/${sid}/evidence/presign`, {
    token,
    json: {
      originalFileName: 'result.csv',
      contentType: 'text/csv',
      fileSize: 16,
      evidenceType: 'EXCEL_SUMMARY',
      relatedAxis: 'IMPACT',
    },
  });
  assert(presign.ok && presign.data.uploadUrl.includes('/_local-objects/'), 'presign が API URL を返す');
  const evidenceId = presign.data.evidenceId as string;

  // 6) アップロード（presign 先へ PUT）
  const csv = 'a,b\n1,2\n';
  const put = await req('PUT', pathOf(presign.data.uploadUrl), { raw: csv, contentType: 'text/csv' });
  assert(put.ok, 'presigned URL への PUT が成功する');

  // 7) 確定
  const confirm = await req('POST', `/submissions/${sid}/evidence/confirm`, {
    token,
    json: { evidenceId },
  });
  assert(confirm.ok && confirm.data.storageStatus === 'uploaded', '証跡が uploaded になる');

  // 8) ダウンロード（内容一致）
  const dl = await req('GET', `/submissions/${sid}/evidence/${evidenceId}/download`, { token });
  assert(dl.ok && dl.data.url, 'ダウンロードURLを取得できる');
  const file = await req('GET', pathOf(dl.data.url));
  assert(file.status === 200 && file.text === csv, 'ダウンロード内容が一致する');

  // 8b) 改竄トークンは拒否される（HMAC 署名検証）
  const tampered = pathOf(dl.data.url).replace(/token=([^&]+)/, 'token=$1x');
  const bad = await req('GET', tampered);
  assert(bad.status === 403, '改竄トークンは 403 で拒否される');

  // 9) 提出
  const submit = await req('POST', `/submissions/${sid}/submit`, { token });
  assert(submit.ok && submit.data.status === 'submitted', '提出できる（MVPはブロックしない）');

  // 10) 事務局でログイン → 承認
  const office = await req('POST', '/auth/login', { json: { userId: 'user-005' } });
  const otoken = office.data.token as string;
  const approve = await req('POST', `/submissions/${sid}/approve`, {
    token: otoken,
    json: { comment: 'OK' },
  });
  assert(approve.ok && approve.data.status === 'approved', '事務局が承認できる');

  // 11) 監査Agent 実行
  const audit = await req('POST', '/admin/audit/run', {
    token: otoken,
    json: { fiscalYear: '2026' },
  });
  assert(audit.ok && audit.data.resultsWritten > 0, '監査Agentが結果を書き込む');

  // 12) 集計
  const stats = await req('GET', '/admin/stats?fiscalYear=2026', { token: otoken });
  assert(stats.ok && stats.data.totalSubmissions >= 4, '集計に新規提出が反映される');

  // 13) JSONエクスポート（schemaVersion 1.0 準拠）
  const exp = await req('POST', '/admin/export', {
    token: otoken,
    json: { fiscalYear: '2026', format: 'json' },
  });
  assert(exp.ok && exp.data.status === 'completed', 'JSONエクスポートが完了する');
  const expDl = await req('GET', `/admin/export/${exp.data.exportJobId}/download`, { token: otoken });
  const doc = await req('GET', pathOf(expDl.data.url));
  const parsed = ExportDocumentSchema.parse(doc.data);
  assert(parsed.schemaVersion === '1.0', 'エクスポートが §16.2 スキーマに一致する');

  // 14) RBAC: 他人の提出は一般入力者から見えない
  const otherToken = (await req('POST', '/auth/login', { json: { userId: 'user-002' } })).data
    .token as string;
  const forbidden = await req('GET', `/submissions/${sid}`, { token: otherToken });
  assert(forbidden.status === 403, '他人の提出は閲覧できない（RBAC）');

  // 15) 一括取込（CSV）: presign→PUT→ドライラン→取込
  const csvImport =
    '部署ID,氏名,テーマ名,達成内容,影響度,貢献度,証跡有無\ndept-002,取込 太郎,取込テスト,一括取込の検証,3,4,資料あり\n';
  const ipresign = await req('POST', '/admin/import/presign', {
    token: otoken,
    json: { fileName: 'bulk.csv', contentType: 'text/csv', fileSize: csvImport.length },
  });
  assert(ipresign.ok && ipresign.data.s3Key, '取込: presign が発行される');
  const iput = await req('PUT', pathOf(ipresign.data.uploadUrl), {
    raw: csvImport,
    contentType: 'text/csv',
  });
  assert(iput.ok, '取込: ファイルを PUT できる');
  const dry = await req('POST', '/admin/import', {
    token: otoken,
    json: { fiscalYear: '2026', s3Key: ipresign.data.s3Key, dryRun: true },
  });
  assert(dry.ok && dry.data.total === 1 && dry.data.failed === 0, '取込: ドライランで1行OK');
  const imp = await req('POST', '/admin/import', {
    token: otoken,
    json: { fiscalYear: '2026', s3Key: ipresign.data.s3Key, dryRun: false },
  });
  assert(imp.ok && imp.data.created === 1, '取込: 1件作成される');

  // 16) 外部Agent: APIキー（Bearer）で集計を取得できる
  const agent = await req('GET', '/admin/stats?fiscalYear=2026', { token: 'e2e-agent-key' });
  assert(
    agent.ok && typeof agent.data.totalSubmissions === 'number',
    '外部Agent APIキーで集計を取得できる',
  );
  const badKey = await req('GET', '/admin/stats?fiscalYear=2026', { token: 'wrong-key' });
  assert(badKey.status === 401, '不正なAPIキーは 401 で拒否される');
}

main()
  .then(() => {
    console.log(`\n✅ ローカル統合テスト 合格（${passed} アサーション）\n`);
    rmSync(TMP, { recursive: true, force: true });
    process.exit(0);
  })
  .catch((e) => {
    console.error(`\n❌ ${e instanceof Error ? e.message : e}\n`);
    rmSync(TMP, { recursive: true, force: true });
    process.exit(1);
  });
