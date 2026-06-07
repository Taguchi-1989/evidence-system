/**
 * 有効ポリシーの解決と、提出時バリデーション（要件 §7 strictSubmissionValidation 配線）。
 * MVP（strict=false）では入力/証跡不足でブロックしない（§10.1, §21）。
 * STRICT（strict=true）にすると同じコードがブロックに切り替わる（§5.4）。
 */
import type { Policy, Submission } from '@evidence/shared';
import { resolvePolicy, EVIDENCE_PRESENCE_WITHOUT_FILE } from '@evidence/shared';
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

export interface Problem {
  path: string;
  message: string;
}

/** データ整合性の最低限：どのモードでも識別できるようタイトルは必須。 */
export function validateMinimal(s: Submission): Problem[] {
  const problems: Problem[] = [];
  if (!s.title?.trim()) problems.push({ path: 'title', message: 'テーマ名を入力してください' });
  return problems;
}

/** STRICT 時の完全性チェック（§5.4）。MVP では呼ばれない。 */
export function validateStrict(s: Submission, policy: Policy): Problem[] {
  const problems: Problem[] = [];
  if (!s.achievementText?.trim())
    problems.push({ path: 'achievementText', message: '達成内容を入力してください' });
  if (s.impactLevelSelf == null)
    problems.push({ path: 'impactLevelSelf', message: '影響度を選択してください' });
  if (s.contributionLevelSelf == null)
    problems.push({ path: 'contributionLevelSelf', message: '貢献度を選択してください' });

  if (policy.evidenceRequired && !s.hasEvidence) {
    const hasReason = s.noEvidenceReason?.trim().length > 0;
    const reasonAllowed =
      policy.allowNoEvidenceReason && EVIDENCE_PRESENCE_WITHOUT_FILE.includes(s.evidencePresence);
    if (!(reasonAllowed && hasReason)) {
      problems.push({
        path: 'evidence',
        message: '証跡資料の添付、または証跡なし理由の入力が必要です',
      });
    }
  }
  return problems;
}

/** 提出可否の判定。strict のときのみ problems をブロック理由として返す。 */
export function validateForSubmit(
  s: Submission,
  policy: Policy,
): { blocked: boolean; problems: Problem[] } {
  const problems = validateMinimal(s);
  if (policy.strictSubmissionValidation) {
    problems.push(...validateStrict(s, policy));
    return { blocked: problems.length > 0, problems };
  }
  // MVP: 最低限(タイトル)以外はブロックしない。
  return { blocked: problems.length > 0, problems };
}
