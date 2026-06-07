/** 管理者集計（要件 §10.2）。MVP 規模では年度の提出を走査して算出（§17.3 即時性不要）。 */
import type { StatsResponse, Submission } from '@evidence/shared';
import {
  EVIDENCE_PRESENCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  IMPACT_LEVEL_LABELS,
  CONTRIBUTION_LEVEL_LABELS,
  AUDIT_RESULT_LABELS,
  EVIDENCE_PRESENCES,
  EVIDENCE_TYPES,
  AUDIT_RESULTS,
  type EvidencePresence,
  type EvidenceType,
  type AuditResultCode,
} from '@evidence/shared';
import { listByFiscalYear } from '../repositories/submissions.js';
import { listEvidence } from '../repositories/evidence.js';
import { listAuditByYear } from '../repositories/audit.js';
import { listDepartments } from '../repositories/departments.js';
import { listUsers } from '../repositories/users.js';

const SUBMITTED_STATUSES: Submission['status'][] = ['submitted', 'approved'];

export async function computeStats(fiscalYear: string): Promise<StatsResponse> {
  const [submissions, departments, users, auditResults] = await Promise.all([
    listByFiscalYear(fiscalYear),
    listDepartments(fiscalYear),
    listUsers(),
    listAuditByYear(fiscalYear),
  ]);

  // ステータス別
  const byStatus = { draft: 0, submitted: 0, returned: 0, approved: 0 };
  for (const s of submissions) byStatus[s.status]++;

  // 提出済み/未提出 人数（contributor 名簿基準）
  const contributors = users.filter((u) => u.role === 'contributor');
  const submittedUserIds = new Set(
    submissions.filter((s) => SUBMITTED_STATUSES.includes(s.status)).map((s) => s.userId),
  );
  const submittedContributorIds = new Set(
    contributors.filter((u) => submittedUserIds.has(u.userId)).map((u) => u.userId),
  );
  const expectedContributorCount = contributors.length;
  const submittedUserCount = submittedContributorIds.size;
  const notSubmittedUserCount = Math.max(0, expectedContributorCount - submittedUserCount);

  // 証跡有無別
  const presenceCounts = new Map<EvidencePresence, number>();
  for (const s of submissions)
    presenceCounts.set(s.evidencePresence, (presenceCounts.get(s.evidencePresence) ?? 0) + 1);
  const byEvidencePresence = EVIDENCE_PRESENCES.map((key) => ({
    key,
    label: EVIDENCE_PRESENCE_LABELS[key],
    count: presenceCounts.get(key) ?? 0,
  }));
  const evidenceAggregates = {
    available: presenceCounts.get('AVAILABLE') ?? 0,
    none: presenceCounts.get('NONE') ?? 0,
    preparing: presenceCounts.get('PREPARING') ?? 0,
    confidential: presenceCounts.get('CONFIDENTIAL') ?? 0,
    other:
      (presenceCounts.get('IN_OTHER_SYSTEM') ?? 0) +
      (presenceCounts.get('ORAL_NOT_DOCUMENTED') ?? 0) +
      (presenceCounts.get('OTHER') ?? 0),
  };

  // 影響度・貢献度別
  const impactCounts = new Map<number, number>();
  const contribCounts = new Map<number, number>();
  for (const s of submissions) {
    if (s.impactLevelSelf != null)
      impactCounts.set(s.impactLevelSelf, (impactCounts.get(s.impactLevelSelf) ?? 0) + 1);
    if (s.contributionLevelSelf != null)
      contribCounts.set(
        s.contributionLevelSelf,
        (contribCounts.get(s.contributionLevelSelf) ?? 0) + 1,
      );
  }
  const byImpactLevel = ([1, 2, 3, 4, 5] as const).map((level) => ({
    level,
    label: IMPACT_LEVEL_LABELS[level],
    count: impactCounts.get(level) ?? 0,
  }));
  const byContributionLevel = ([1, 2, 3, 4, 5] as const).map((level) => ({
    level,
    label: CONTRIBUTION_LEVEL_LABELS[level],
    count: contribCounts.get(level) ?? 0,
  }));

  // 部署別
  const deptName = new Map(departments.map((d) => [d.departmentId, d.name]));
  const deptStat = new Map<string, { total: number; submitted: number; approved: number }>();
  for (const s of submissions) {
    const cur = deptStat.get(s.departmentId) ?? { total: 0, submitted: 0, approved: 0 };
    cur.total++;
    if (s.status === 'submitted') cur.submitted++;
    if (s.status === 'approved') cur.approved++;
    deptStat.set(s.departmentId, cur);
  }
  const byDepartment = [...deptStat.entries()].map(([departmentId, v]) => ({
    departmentId,
    name: deptName.get(departmentId) ?? departmentId,
    ...v,
  }));

  // 証跡タイプ別（提出ごとに証跡を走査）
  const typeCounts = new Map<EvidenceType, number>();
  const evidenceLists = await Promise.all(submissions.map((s) => listEvidence(s.submissionId)));
  for (const list of evidenceLists) {
    for (const ev of list) typeCounts.set(ev.evidenceType, (typeCounts.get(ev.evidenceType) ?? 0) + 1);
  }
  const byEvidenceType = EVIDENCE_TYPES.map((key) => ({
    key,
    label: EVIDENCE_TYPE_LABELS[key],
    count: typeCounts.get(key) ?? 0,
  })).filter((t) => t.count > 0);

  // 監査結果別（最新 run のみを対象にせず、保存済み全件を集計：MVP簡易）
  const auditCounts = new Map<AuditResultCode, number>();
  for (const a of auditResults) auditCounts.set(a.result, (auditCounts.get(a.result) ?? 0) + 1);
  const byAuditResult = AUDIT_RESULTS.map((key) => ({
    key,
    label: AUDIT_RESULT_LABELS[key],
    count: auditCounts.get(key) ?? 0,
  })).filter((a) => a.count > 0);

  return {
    fiscalYear,
    totalSubmissions: submissions.length,
    byStatus,
    submittedUserCount,
    notSubmittedUserCount,
    expectedContributorCount,
    byEvidencePresence,
    evidenceAggregates,
    byImpactLevel,
    byContributionLevel,
    byDepartment,
    byEvidenceType,
    byAuditResult,
  };
}
