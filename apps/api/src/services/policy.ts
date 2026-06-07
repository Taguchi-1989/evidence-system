/**
 * 有効ポリシーの解決。提出バリデーションの実体は @evidence/shared に移管し、
 * フロント/バックで同一ロジックを共有する（運用モード連動の唯一の真実源）。
 */
import { resolvePolicy, type Policy } from '@evidence/shared';
import { getPolicyConfig } from '../repositories/config.js';

export interface EffectivePolicy {
  fiscalYear: string;
  mode: string;
  policy: Policy;
}

export async function getEffectivePolicy(fiscalYear: string): Promise<EffectivePolicy> {
  const cfg = await getPolicyConfig(fiscalYear);
  return { fiscalYear, mode: cfg.mode, policy: resolvePolicy(cfg.mode, cfg.overrides) };
}

// 提出バリデーションは共有実装を再公開（既存の import 互換）
export { validateForSubmit, validateMinimal, validateStrict, type Problem } from '@evidence/shared';
