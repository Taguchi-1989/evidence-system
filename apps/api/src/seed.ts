/**
 * 初期データ投入（マスタ・ユーザー・ポリシー・デモ提出）。冪等。
 * `pnpm seed`（scripts/seed.ts）と ローカル統合テスト（verify-local.ts）から再利用する。
 */
import type { AuthUser, Department, Submission, EvidenceFile } from '@evidence/shared';
import { defaultPolicyConfig } from '@evidence/shared';
import { config } from './config.js';
import { createTableIfNotExists } from './db/admin.js';
import { ensureBucket, putObject, BUCKET_LABEL } from './storage/objects.js';
import { evidenceS3Key } from './s3/keys.js';
import { putUser } from './repositories/users.js';
import { putDepartment } from './repositories/departments.js';
import { savePolicyConfig } from './repositories/config.js';
import { saveSubmission } from './repositories/submissions.js';
import { saveEvidence } from './repositories/evidence.js';
import { nowIso } from './lib/util.js';

const FY = '2026';

const departments: Department[] = [
  { departmentId: 'dept-100', name: '本部', parentDepartmentId: null },
  { departmentId: 'dept-001', name: '営業部', parentDepartmentId: 'dept-100' },
  { departmentId: 'dept-002', name: '開発部', parentDepartmentId: 'dept-100' },
  { departmentId: 'dept-003', name: '管理部', parentDepartmentId: 'dept-100' },
];

const users: AuthUser[] = [
  { userId: 'user-001', name: '田中 太郎', role: 'contributor', departmentId: 'dept-002', managedDepartmentIds: [] },
  { userId: 'user-002', name: '佐藤 花子', role: 'contributor', departmentId: 'dept-001', managedDepartmentIds: [] },
  { userId: 'user-003', name: '鈴木 一郎', role: 'manager', departmentId: 'dept-002', managedDepartmentIds: ['dept-002'] },
  { userId: 'user-004', name: '高橋 部長', role: 'manager', departmentId: 'dept-100', managedDepartmentIds: ['dept-100', 'dept-001', 'dept-002', 'dept-003'] },
  { userId: 'user-005', name: '事務局 担当', role: 'office', departmentId: 'dept-003', managedDepartmentIds: [] },
  { userId: 'user-006', name: '監査 太郎', role: 'auditor', departmentId: 'dept-003', managedDepartmentIds: [] },
  { userId: 'user-007', name: 'システム 管理者', role: 'admin', departmentId: 'dept-003', managedDepartmentIds: [] },
];

function baseSubmission(
  over: Partial<Submission> &
    Pick<Submission, 'submissionId' | 'userId' | 'departmentId' | 'userName' | 'title'>,
): Submission {
  const ts = nowIso();
  return {
    fiscalYear: FY,
    achievementText: '',
    impactLevelSelf: null,
    impactReason: '',
    contributionLevelSelf: null,
    contributionReason: '',
    evidencePresence: 'NONE',
    hasEvidence: false,
    noEvidenceReason: '',
    supplementaryComment: '',
    status: 'draft',
    reviewComment: '',
    createdAt: ts,
    updatedAt: ts,
    submittedAt: null,
    approvedAt: null,
    approverId: null,
    deletedAt: null,
    ...over,
  };
}

async function seedDemoSubmissions(): Promise<void> {
  // 1) 証跡あり・提出済み（ダミーCSVを格納し、ダウンロード/監査をデモ可能に）
  const sub1 = baseSubmission({
    submissionId: 'sub-001',
    userId: 'user-001',
    departmentId: 'dept-002',
    userName: '田中 太郎',
    title: '月次集計作業の自動化',
    achievementText: '月次集計作業をスクリプト化し、作業時間を約8時間/月削減した。',
    impactLevelSelf: 3,
    impactReason: '部署内の月次作業に適用されたため',
    contributionLevelSelf: 4,
    contributionReason: '要件整理から実装、運用説明まで担当したため',
    evidencePresence: 'AVAILABLE',
    hasEvidence: true,
    status: 'submitted',
    submittedAt: nowIso(),
  });
  await saveSubmission(sub1);

  const ev1: EvidenceFile = {
    evidenceId: 'ev-001',
    submissionId: 'sub-001',
    fiscalYear: FY,
    s3Bucket: BUCKET_LABEL,
    s3Key: evidenceS3Key({
      fiscalYear: FY,
      departmentId: 'dept-002',
      userId: 'user-001',
      submissionId: 'sub-001',
      evidenceId: 'ev-001',
      originalFileName: 'before_after.csv',
    }),
    originalFileName: 'before_after.csv',
    contentType: 'text/csv',
    fileSize: 0,
    checksum: null,
    evidenceType: 'EXCEL_SUMMARY',
    relatedAxis: 'IMPACT',
    description: '改善前後の作業時間を比較した資料',
    uploadedBy: 'user-001',
    uploadedAt: nowIso(),
    isConfidential: false,
    storageStatus: 'uploaded',
    deletedAt: null,
  };
  const csv = '工程,改善前(分),改善後(分)\n月次集計,480,15\nレビュー,60,30\n';
  await putObject(ev1.s3Key, csv, 'text/csv');
  await saveEvidence({ ...ev1, fileSize: Buffer.byteLength(csv) });

  // 2) 機密のため未添付・提出済み（ファイルなし、理由あり）
  await saveSubmission(
    baseSubmission({
      submissionId: 'sub-002',
      userId: 'user-002',
      departmentId: 'dept-001',
      userName: '佐藤 花子',
      title: '大口顧客向け提案の獲得',
      achievementText: '新規大口顧客との契約を獲得した。',
      impactLevelSelf: 5,
      impactReason: '全社売上に寄与したため',
      contributionLevelSelf: 3,
      contributionReason: '提案チームの主要担当として参画',
      evidencePresence: 'CONFIDENTIAL',
      hasEvidence: false,
      noEvidenceReason: '契約金額を含むため社外秘。所在は営業部共有フォルダ。',
      status: 'submitted',
      submittedAt: nowIso(),
    }),
  );

  // 3) 下書き（未提出）
  await saveSubmission(
    baseSubmission({
      submissionId: 'sub-003',
      userId: 'user-001',
      departmentId: 'dept-002',
      userName: '田中 太郎',
      title: '社内ドキュメント整備',
      achievementText: '開発部の手順書を再整備中。',
      impactLevelSelf: 2,
      impactReason: '',
      contributionLevelSelf: 4,
      contributionReason: '',
      evidencePresence: 'PREPARING',
      status: 'draft',
    }),
  );
}

export interface SeedOptions {
  quiet?: boolean;
}

export async function seedAll(opts: SeedOptions = {}): Promise<void> {
  const log = (m: string) => {
    if (!opts.quiet) console.log(m);
  };

  log('[seed] テーブル作成...');
  const createdTable = await createTableIfNotExists();
  log(createdTable ? '  → 作成しました' : '  → 既存');

  log('[seed] バケット作成 + CORS...');
  const createdBucket = await ensureBucket();
  log(createdBucket ? '  → 作成しました' : '  → 既存（CORS再適用）');

  // aws(LocalStack) はテーブルがアクティブになるまで少し待つ。local は不要。
  if (config.storage.driver !== 'local') await new Promise((r) => setTimeout(r, 1000));

  log('[seed] 部署マスタ...');
  for (const d of departments) await putDepartment(FY, d);

  log('[seed] ユーザー...');
  for (const u of users) await putUser(u);

  log('[seed] ポリシー設定（MVP既定）...');
  await savePolicyConfig(defaultPolicyConfig(FY));

  log('[seed] デモ提出...');
  await seedDemoSubmissions();

  log('[seed] 完了 ✅');
  log(`  年度: ${FY} / ユーザー ${users.length} 名 / 部署 ${departments.length} / 提出 3件`);
}
