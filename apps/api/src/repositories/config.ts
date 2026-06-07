/** ポリシー/モード設定（PolicyConfig）リポジトリ。 */
import { defaultPolicyConfig, type PolicyConfig } from '@evidence/shared';
import { getItem, putItem } from '../db/ops.js';
import { policyKeys } from '../db/keys.js';

const TYPE = 'PolicyConfig';

export async function savePolicyConfig(cfg: PolicyConfig): Promise<PolicyConfig> {
  await putItem(TYPE, policyKeys(cfg.fiscalYear), cfg);
  return cfg;
}

/** 設定が無ければ MVP 既定を返す（保存はしない） */
export async function getPolicyConfig(fiscalYear: string): Promise<PolicyConfig> {
  const keys = policyKeys(fiscalYear);
  const found = await getItem<PolicyConfig>(keys.pk, keys.sk);
  return found ?? defaultPolicyConfig(fiscalYear);
}
