/**
 * ポリシー設定（要件 §7）と運用モード（§6）の定義。
 * 「内部は本番相当」の核。システムの振る舞いはここの設定で切り替わる。
 *
 * MVP では既定値（§7初期値）で動作し、利用者には証跡を強制しない。
 * モードを TRANSITION / STRICT に上げるとフラグのプリセットが切り替わり、
 * 段階的に要求水準を上げられる（コード変更不要）。
 */
import { z } from 'zod';
import { OperationModeEnum, type OperationMode } from './enums.js';

export const PolicySchema = z.object({
  /** 証跡提出を必須にするか */
  evidenceRequired: z.boolean(),
  /** 証跡を成果主張ごとに紐づけることを必須にするか（将来Claim） */
  claimLinkRequired: z.boolean(),
  /** 証跡なし理由の入力を許可するか */
  allowNoEvidenceReason: z.boolean(),
  /** 夜間監査Agentを実行するか */
  auditAgentEnabled: z.boolean(),
  /** 監査Agent結果を利用者に表示するか */
  auditResultVisibleToUser: z.boolean(),
  /** 監査Agent結果を管理者に表示するか */
  auditResultVisibleToManager: z.boolean(),
  /** 提出時に証跡・入力不足をブロックするか */
  strictSubmissionValidation: z.boolean(),
  /** JSONエクスポートを有効にするか */
  exportJsonEnabled: z.boolean(),
  /** CSVエクスポートを有効にするか */
  exportCsvEnabled: z.boolean(),
});
export type Policy = z.infer<typeof PolicySchema>;

/** §7 初期値（MVP 既定） */
export const DEFAULT_POLICY: Policy = {
  evidenceRequired: false,
  claimLinkRequired: false,
  allowNoEvidenceReason: true,
  auditAgentEnabled: true,
  auditResultVisibleToUser: false,
  auditResultVisibleToManager: true,
  strictSubmissionValidation: false,
  exportJsonEnabled: true,
  exportCsvEnabled: true,
};

/**
 * 運用モードごとのポリシープリセット（§5, §6）。
 * モードを上げると段階的に要求が厳しくなる。
 * 実際の有効ポリシーは「プリセット ＋ 個別上書き」で決まる（resolvePolicy 参照）。
 */
export const MODE_POLICY_PRESETS: Record<OperationMode, Policy> = {
  TRIAL: {
    ...DEFAULT_POLICY,
    auditResultVisibleToManager: false, // 試行段階は管理者にも監査結果を見せない
  },
  MVP: {
    ...DEFAULT_POLICY,
  },
  TRANSITION: {
    ...DEFAULT_POLICY,
    // 移行期：証跡なし理由を必須化し、監査結果を管理者確認に利用（§5.3）
    allowNoEvidenceReason: true,
    auditResultVisibleToManager: true,
  },
  STRICT: {
    // 本格運用：証跡提出を原則必須、Claim紐づけ、提出時バリデーション（§5.4）
    evidenceRequired: true,
    claimLinkRequired: true,
    allowNoEvidenceReason: true,
    auditAgentEnabled: true,
    auditResultVisibleToUser: false,
    auditResultVisibleToManager: true,
    strictSubmissionValidation: true,
    exportJsonEnabled: true,
    exportCsvEnabled: true,
  },
};

/** 設定エンティティ全体（DynamoDB CONFIG#<year> / POLICY に保存） */
export const PolicyConfigSchema = z.object({
  fiscalYear: z.string(),
  mode: OperationModeEnum,
  /** モードプリセットからの個別上書き（部分指定可） */
  overrides: PolicySchema.partial().default({}),
  updatedAt: z.string().optional(),
  updatedBy: z.string().optional(),
});
export type PolicyConfig = z.infer<typeof PolicyConfigSchema>;

/** モードプリセットに overrides を適用して、有効なポリシーを解決する */
export function resolvePolicy(mode: OperationMode, overrides: Partial<Policy> = {}): Policy {
  return { ...MODE_POLICY_PRESETS[mode], ...overrides };
}

/** 年度のデフォルト設定（MVP モード） */
export function defaultPolicyConfig(fiscalYear: string): PolicyConfig {
  return { fiscalYear, mode: 'MVP', overrides: {} };
}
