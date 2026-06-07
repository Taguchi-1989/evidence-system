/**
 * JSONエクスポートの出力スキーマ — 要件 §16.2 / §16.3。
 * 他システムへの移行・連携を前提とした versioned スキーマ。
 * このファイルの形は外部契約。変更時は SCHEMA_VERSION を上げる（§17.4）。
 */
import { z } from 'zod';

export const SCHEMA_VERSION = '1.0';

const ExportImpactSchema = z.object({
  selfLevel: z.number().nullable(),
  label: z.string().nullable(),
  reason: z.string(),
});

const ExportContributionSchema = z.object({
  selfLevel: z.number().nullable(),
  label: z.string().nullable(),
  reason: z.string(),
});

const ExportEvidenceStatusSchema = z.object({
  hasEvidence: z.boolean(),
  presence: z.string(),
  presenceLabel: z.string(),
  noEvidenceReason: z.string().nullable(),
});

const ExportEvidenceFileSchema = z.object({
  evidenceId: z.string(),
  evidenceType: z.string(),
  evidenceTypeLabel: z.string(),
  relatedAxis: z.string(),
  fileName: z.string(),
  s3Key: z.string(),
  description: z.string(),
  isConfidential: z.boolean(),
});

const ExportAuditResultSchema = z.object({
  auditId: z.string(),
  result: z.string(),
  relatedScore: z.number().nullable(),
  impactSupportScore: z.number().nullable(),
  contributionSupportScore: z.number().nullable(),
  reason: z.string(),
});

export const ExportSubmissionSchema = z.object({
  submissionId: z.string(),
  userId: z.string(),
  departmentId: z.string(),
  title: z.string(),
  achievementText: z.string(),
  impact: ExportImpactSchema,
  contribution: ExportContributionSchema,
  evidenceStatus: ExportEvidenceStatusSchema,
  evidenceFiles: z.array(ExportEvidenceFileSchema),
  auditResults: z.array(ExportAuditResultSchema),
  status: z.string(),
});
export type ExportSubmission = z.infer<typeof ExportSubmissionSchema>;

/** エクスポート全体（§16.2 のトップレベル形） */
export const ExportDocumentSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  exportedAt: z.string(),
  fiscalYear: z.string(),
  submissions: z.array(ExportSubmissionSchema),
});
export type ExportDocument = z.infer<typeof ExportDocumentSchema>;
