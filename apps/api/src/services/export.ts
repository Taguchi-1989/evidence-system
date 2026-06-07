/**
 * エクスポート生成（要件 §16）。JSON は schemaVersion 1.0（§16.2）に厳密準拠。
 * 他システム移行を前提とした versioned 出力。
 */
import {
  SCHEMA_VERSION,
  IMPACT_LEVEL_LABELS,
  CONTRIBUTION_LEVEL_LABELS,
  EVIDENCE_PRESENCE_LABELS,
  EVIDENCE_TYPE_LABELS,
  type ExportDocument,
  type ExportSubmission,
} from '@evidence/shared';
import { listByFiscalYear } from '../repositories/submissions.js';
import { listEvidence } from '../repositories/evidence.js';
import { listAuditBySubmission } from '../repositories/audit.js';
import { nowIso } from '../lib/util.js';

/** §16.2 構造の JSON ドキュメントを構築 */
export async function buildExportDocument(fiscalYear: string): Promise<ExportDocument> {
  const submissions = await listByFiscalYear(fiscalYear);

  const out: ExportSubmission[] = [];
  for (const s of submissions) {
    const [evidence, audits] = await Promise.all([
      listEvidence(s.submissionId),
      listAuditBySubmission(s.submissionId),
    ]);

    out.push({
      submissionId: s.submissionId,
      userId: s.userId,
      departmentId: s.departmentId,
      title: s.title,
      achievementText: s.achievementText,
      impact: {
        selfLevel: s.impactLevelSelf,
        label: s.impactLevelSelf ? IMPACT_LEVEL_LABELS[s.impactLevelSelf] : null,
        reason: s.impactReason,
      },
      contribution: {
        selfLevel: s.contributionLevelSelf,
        label: s.contributionLevelSelf ? CONTRIBUTION_LEVEL_LABELS[s.contributionLevelSelf] : null,
        reason: s.contributionReason,
      },
      evidenceStatus: {
        hasEvidence: s.hasEvidence,
        presence: s.evidencePresence,
        presenceLabel: EVIDENCE_PRESENCE_LABELS[s.evidencePresence],
        noEvidenceReason: s.noEvidenceReason || null,
      },
      evidenceFiles: evidence.map((ev) => ({
        evidenceId: ev.evidenceId,
        evidenceType: ev.evidenceType,
        evidenceTypeLabel: EVIDENCE_TYPE_LABELS[ev.evidenceType],
        relatedAxis: ev.relatedAxis,
        fileName: ev.originalFileName,
        s3Key: ev.s3Key,
        description: ev.description,
        isConfidential: ev.isConfidential,
      })),
      auditResults: audits.map((a) => ({
        auditId: a.auditId,
        result: a.result,
        relatedScore: a.relatedScore,
        impactSupportScore: a.impactSupportScore,
        contributionSupportScore: a.contributionSupportScore,
        reason: a.reason,
      })),
      status: s.status,
    });
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(),
    fiscalYear,
    submissions: out,
  };
}

function csvEscape(v: unknown): string {
  let s = v == null ? '' : String(v);
  // CSV 数式インジェクション対策：=+-@ 等で始まるセルは先頭に ' を付けて無害化
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** 提出一覧をフラット化した CSV */
export async function buildExportCsv(fiscalYear: string): Promise<string> {
  const doc = await buildExportDocument(fiscalYear);
  const headers = [
    'submissionId',
    'userId',
    'departmentId',
    'title',
    'achievementText',
    'impactLevel',
    'impactLabel',
    'impactReason',
    'contributionLevel',
    'contributionLabel',
    'contributionReason',
    'evidencePresence',
    'hasEvidence',
    'noEvidenceReason',
    'evidenceFileCount',
    'status',
  ];
  const rows = doc.submissions.map((s) =>
    [
      s.submissionId,
      s.userId,
      s.departmentId,
      s.title,
      s.achievementText,
      s.impact.selfLevel ?? '',
      s.impact.label ?? '',
      s.impact.reason,
      s.contribution.selfLevel ?? '',
      s.contribution.label ?? '',
      s.contribution.reason,
      s.evidenceStatus.presence,
      s.evidenceStatus.hasEvidence,
      s.evidenceStatus.noEvidenceReason ?? '',
      s.evidenceFiles.length,
      s.status,
    ]
      .map(csvEscape)
      .join(','),
  );
  // Excel が UTF-8 を正しく読めるよう BOM を付与
  return '﻿' + [headers.join(','), ...rows].join('\r\n');
}
