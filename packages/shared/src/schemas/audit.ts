/** 監査結果（AuditResult）スキーマ — 要件 §12.4 / §15。評価確定ではなく参考判定。 */
import { z } from 'zod';
import { AuditResultCodeEnum } from '../enums.js';

const score = z.number().min(0).max(100).nullable();

export const AuditResultSchema = z.object({
  auditId: z.string(),
  auditRunId: z.string(),
  submissionId: z.string(),
  /** 提出単位の監査では null（ファイル単位のときに evidenceId が入る） */
  evidenceId: z.string().nullable(),
  result: AuditResultCodeEnum,
  reason: z.string(),
  /** 全体的な確信度 0〜100 */
  confidence: score,
  /** 関連度 0〜100（§15.3） */
  relatedScore: score,
  /** 影響度との対応 0〜100 */
  impactSupportScore: score,
  /** 貢献度との対応 0〜100 */
  contributionSupportScore: score,
  /** 抽出された根拠文 */
  extractedSummary: z.string(),
  /** 対象ページ・スライド・シート */
  citedLocation: z.string(),
  checkedAt: z.string(),
  modelName: z.string(),
  modelVersion: z.string(),
});
export type AuditResult = z.infer<typeof AuditResultSchema>;

/** 監査Agent 実行要求（§10.5, §15） */
export const AuditRunRequestSchema = z.object({
  fiscalYear: z.string().min(4),
  /** 指定があればその提出のみ。なければ年度内の対象を列挙 */
  submissionId: z.string().optional(),
});
export type AuditRunRequest = z.infer<typeof AuditRunRequestSchema>;

export const AuditRunSummarySchema = z.object({
  auditRunId: z.string(),
  fiscalYear: z.string(),
  startedAt: z.string(),
  finishedAt: z.string(),
  submissionsChecked: z.number(),
  evidencesChecked: z.number(),
  resultsWritten: z.number(),
});
export type AuditRunSummary = z.infer<typeof AuditRunSummarySchema>;
