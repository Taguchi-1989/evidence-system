/** マスタ（部署 等）スキーマ — 要件 §11.1 マスタ管理 / §13.3 部署単位制御 */
import { z } from 'zod';
import {
  EVIDENCE_TYPE_LABELS,
  IMPACT_LEVEL_LABELS,
  CONTRIBUTION_LEVEL_LABELS,
  EVIDENCE_PRESENCE_LABELS,
  RELATED_AXIS_LABELS,
} from '../enums.js';

export const DepartmentSchema = z.object({
  departmentId: z.string(),
  name: z.string(),
  /** 上位部署（上長の配下組織判定に使用） */
  parentDepartmentId: z.string().nullable().default(null),
});
export type Department = z.infer<typeof DepartmentSchema>;

export const UpsertDepartmentSchema = z.object({
  departmentId: z.string().min(1).max(50),
  name: z.string().min(1).max(100),
  parentDepartmentId: z.string().nullable().optional(),
});
export type UpsertDepartmentInput = z.infer<typeof UpsertDepartmentSchema>;

/**
 * フロントが選択肢を組み立てるためのマスタ応答。
 * 部署は DynamoDB から、固定選択肢（証跡タイプ・影響度・貢献度等）は enum ラベルから返す。
 * 将来マスタ化する場合も同じレスポンス形を保てる（§17.4 保守性）。
 */
export const MastersResponseSchema = z.object({
  departments: z.array(DepartmentSchema),
  evidenceTypes: z.array(z.object({ value: z.string(), label: z.string() })),
  impactLevels: z.array(z.object({ value: z.number(), label: z.string() })),
  contributionLevels: z.array(z.object({ value: z.number(), label: z.string() })),
  evidencePresences: z.array(z.object({ value: z.string(), label: z.string() })),
  relatedAxes: z.array(z.object({ value: z.string(), label: z.string() })),
});
export type MastersResponse = z.infer<typeof MastersResponseSchema>;

/** enum ラベルから固定選択肢部分を構築（部署は呼び出し側で合成） */
export function buildStaticMasters() {
  const fromLabels = (labels: Record<string, string>) =>
    Object.entries(labels).map(([value, label]) => ({ value, label }));
  return {
    evidenceTypes: fromLabels(EVIDENCE_TYPE_LABELS),
    impactLevels: Object.entries(IMPACT_LEVEL_LABELS).map(([value, label]) => ({
      value: Number(value),
      label,
    })),
    contributionLevels: Object.entries(CONTRIBUTION_LEVEL_LABELS).map(([value, label]) => ({
      value: Number(value),
      label,
    })),
    evidencePresences: fromLabels(EVIDENCE_PRESENCE_LABELS),
    relatedAxes: fromLabels(RELATED_AXIS_LABELS),
  };
}
