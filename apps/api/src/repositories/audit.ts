/** 監査結果（AuditResult）リポジトリ。 */
import type { AuditResult } from '@evidence/shared';
import { putItem, query } from '../db/ops.js';
import { auditKeys, auditSkPrefix, submissionPk, yearAuditGsi1pk } from '../db/keys.js';

const TYPE = 'AuditResult';

export async function saveAuditResult(a: AuditResult, fiscalYear: string): Promise<AuditResult> {
  const keys = auditKeys({
    submissionId: a.submissionId,
    auditRunId: a.auditRunId,
    evidenceId: a.evidenceId,
    auditId: a.auditId,
    fiscalYear,
    checkedAt: a.checkedAt,
  });
  await putItem(TYPE, keys, a);
  return a;
}

/** 提出単位の監査結果 */
export async function listAuditBySubmission(submissionId: string): Promise<AuditResult[]> {
  return query<AuditResult>(submissionPk(submissionId), { skPrefix: auditSkPrefix });
}

/** 年度の監査結果一覧（監査結果画面） */
export async function listAuditByYear(fiscalYear: string): Promise<AuditResult[]> {
  return query<AuditResult>(yearAuditGsi1pk(fiscalYear), { index: 'gsi1', descending: true });
}
