/**
 * DynamoDB 単一テーブルのキー設計（プラン「データ設計」）。
 * すべてのキー構築をここに集約し、アクセスパターンを一望できるようにする。
 *
 * テーブル: pk, sk + GSI1(gsi1pk,gsi1sk), GSI2(gsi2pk,gsi2sk), GSI3(gsi3pk,gsi3sk)
 */

export interface KeySet {
  pk: string;
  sk: string;
  gsi1pk?: string;
  gsi1sk?: string;
  gsi2pk?: string;
  gsi2sk?: string;
  gsi3pk?: string;
  gsi3sk?: string;
}

export const GSI1 = 'gsi1';
export const GSI2 = 'gsi2';
export const GSI3 = 'gsi3';

// ── Submission ──────────────────────────────────────────────
// pk: SUB#<id> / sk: META
// gsi1: 年度×状態（事務局一覧）  gsi2: 部署（上長）  gsi3: ユーザー（自分の提出）
export const submissionKeys = (s: {
  submissionId: string;
  fiscalYear: string;
  departmentId: string;
  userId: string;
  status: string;
  sortTs: string;
}): KeySet => ({
  pk: `SUB#${s.submissionId}`,
  sk: 'META',
  gsi1pk: `FY#${s.fiscalYear}`,
  gsi1sk: `STATUS#${s.status}#${s.sortTs}#${s.submissionId}`,
  gsi2pk: `FY#${s.fiscalYear}#DEPT#${s.departmentId}`,
  gsi2sk: `STATUS#${s.status}#${s.submissionId}`,
  gsi3pk: `USER#${s.userId}`,
  gsi3sk: `FY#${s.fiscalYear}#${s.submissionId}`,
});
export const submissionPk = (submissionId: string) => `SUB#${submissionId}`;
export const yearAllSubmissionsGsi1pk = (fiscalYear: string) => `FY#${fiscalYear}`;
export const deptSubmissionsGsi2pk = (fiscalYear: string, departmentId: string) =>
  `FY#${fiscalYear}#DEPT#${departmentId}`;
export const userSubmissionsGsi3pk = (userId: string) => `USER#${userId}`;

// ── EvidenceFile ────────────────────────────────────────────
// pk: SUB#<submissionId> / sk: EV#<evidenceId>
export const evidenceKeys = (submissionId: string, evidenceId: string): KeySet => ({
  pk: `SUB#${submissionId}`,
  sk: `EV#${evidenceId}`,
});
export const evidenceSkPrefix = 'EV#';

// ── AuditResult ─────────────────────────────────────────────
// pk: SUB#<submissionId> / sk: AUDIT#<auditRunId>#<evidenceId|SUBMISSION>#<auditId>
// gsi1: 年度の監査結果一覧（監査結果画面）
export const auditKeys = (a: {
  submissionId: string;
  auditRunId: string;
  evidenceId: string | null;
  auditId: string;
  fiscalYear: string;
  checkedAt: string;
}): KeySet => ({
  pk: `SUB#${a.submissionId}`,
  sk: `AUDIT#${a.auditRunId}#${a.evidenceId ?? 'SUBMISSION'}#${a.auditId}`,
  gsi1pk: `FY#${a.fiscalYear}#AUDIT`,
  gsi1sk: `${a.checkedAt}#${a.auditId}`,
});
export const auditSkPrefix = 'AUDIT#';
export const yearAuditGsi1pk = (fiscalYear: string) => `FY#${fiscalYear}#AUDIT`;

// ── ActivityLog ─────────────────────────────────────────────
// pk: LOG#<fiscalYear> / sk: <timestamp>#<eventId>
export const activityKeys = (a: {
  fiscalYear: string;
  timestamp: string;
  eventId: string;
  targetType: string;
  targetId: string;
}): KeySet => ({
  pk: `LOG#${a.fiscalYear}`,
  sk: `${a.timestamp}#${a.eventId}`,
  gsi1pk: `LOGTARGET#${a.targetType}#${a.targetId}`,
  gsi1sk: a.timestamp,
});
export const yearLogPk = (fiscalYear: string) => `LOG#${fiscalYear}`;

// ── ExportJob ───────────────────────────────────────────────
// pk: EXPORT#<jobId> / sk: META
export const exportKeys = (jobId: string, fiscalYear: string, createdAt: string): KeySet => ({
  pk: `EXPORT#${jobId}`,
  sk: 'META',
  gsi1pk: `FY#${fiscalYear}#EXPORT`,
  gsi1sk: `${createdAt}#${jobId}`,
});
export const exportPk = (jobId: string) => `EXPORT#${jobId}`;
export const yearExportGsi1pk = (fiscalYear: string) => `FY#${fiscalYear}#EXPORT`;

// ── PolicyConfig ────────────────────────────────────────────
// pk: CONFIG#<fiscalYear> / sk: POLICY
export const policyKeys = (fiscalYear: string): KeySet => ({
  pk: `CONFIG#${fiscalYear}`,
  sk: 'POLICY',
});

// ── Department (master) ─────────────────────────────────────
// pk: MASTER#<fiscalYear> / sk: DEPT#<departmentId>
export const departmentKeys = (fiscalYear: string, departmentId: string): KeySet => ({
  pk: `MASTER#${fiscalYear}`,
  sk: `DEPT#${departmentId}`,
});
export const masterPk = (fiscalYear: string) => `MASTER#${fiscalYear}`;
export const deptSkPrefix = 'DEPT#';

// ── User (mock 認証 + プロフィール) ─────────────────────────
// pk: USER#<userId> / sk: PROFILE  / gsi1: ユーザー一覧（ログイン選択）
export const userKeys = (userId: string, role: string): KeySet => ({
  pk: `USER#${userId}`,
  sk: 'PROFILE',
  gsi1pk: 'USERLIST',
  gsi1sk: `${role}#${userId}`,
});
export const userPk = (userId: string) => `USER#${userId}`;
export const USER_LIST_GSI1PK = 'USERLIST';
