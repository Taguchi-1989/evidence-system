/** 管理者ダッシュボードの集計（読み取りモデル）— 要件 §10.2 */
import { z } from 'zod';

const Count = z.object({ key: z.string(), label: z.string(), count: z.number() });

const LevelCount = z.object({ level: z.number(), label: z.string(), count: z.number() });

const DepartmentStat = z.object({
  departmentId: z.string(),
  name: z.string(),
  total: z.number(),
  submitted: z.number(),
  approved: z.number(),
});

export const StatsResponseSchema = z.object({
  fiscalYear: z.string(),
  totalSubmissions: z.number(),
  byStatus: z.object({
    draft: z.number(),
    submitted: z.number(),
    returned: z.number(),
    approved: z.number(),
  }),
  /** 提出済み人数（status submitted/approved の distinct ユーザー） */
  submittedUserCount: z.number(),
  /** 未提出人数（contributor 名簿のうち未提出） */
  notSubmittedUserCount: z.number(),
  expectedContributorCount: z.number(),
  byEvidencePresence: z.array(Count),
  /** 要件で名指しの集計（証跡あり/なし/準備中/機密未添付） */
  evidenceAggregates: z.object({
    available: z.number(),
    none: z.number(),
    preparing: z.number(),
    confidential: z.number(),
    other: z.number(),
  }),
  byImpactLevel: z.array(LevelCount),
  byContributionLevel: z.array(LevelCount),
  byDepartment: z.array(DepartmentStat),
  byEvidenceType: z.array(Count),
  byAuditResult: z.array(Count),
});
export type StatsResponse = z.infer<typeof StatsResponseSchema>;
