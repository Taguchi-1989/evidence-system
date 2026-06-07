/**
 * 提出バリデーション（フロント/バック共有・純関数）。
 * 運用モードのポリシーに連動して「厳しさ」を切り替える唯一の真実源。
 *   - MVP/Trial（strict=false）: 最低限（タイトル）以外はブロックしない（§10.1, §21）
 *   - Strict（strict=true）   : 達成内容・影響度・貢献度・証跡を必須化（§5.4）
 * バックは getEffectivePolicy と組み合わせて提出APIで使用、フロントは事前チェックに使用。
 */
import type { Policy } from './policy.js';
import { EVIDENCE_PRESENCE_WITHOUT_FILE, type EvidencePresence } from './enums.js';

/** 検証に必要な提出の部分形（フォーム値からも組み立てられる） */
export interface ValidatableSubmission {
  title?: string;
  achievementText?: string;
  impactLevelSelf?: number | null;
  contributionLevelSelf?: number | null;
  hasEvidence?: boolean;
  evidencePresence?: EvidencePresence;
  noEvidenceReason?: string | null;
}

export interface Problem {
  path: string;
  message: string;
}

/** データ整合性の最低限：どのモードでも識別できるようタイトルは必須。 */
export function validateMinimal(s: ValidatableSubmission): Problem[] {
  const problems: Problem[] = [];
  if (!s.title?.trim()) problems.push({ path: 'title', message: 'テーマ名を入力してください' });
  return problems;
}

/** STRICT 時の完全性チェック（§5.4）。MVP では呼ばれない。 */
export function validateStrict(s: ValidatableSubmission, policy: Policy): Problem[] {
  const problems: Problem[] = [];
  if (!s.achievementText?.trim())
    problems.push({ path: 'achievementText', message: '達成内容を入力してください' });
  if (s.impactLevelSelf == null)
    problems.push({ path: 'impactLevelSelf', message: '影響度を選択してください' });
  if (s.contributionLevelSelf == null)
    problems.push({ path: 'contributionLevelSelf', message: '貢献度を選択してください' });

  if (policy.evidenceRequired && !s.hasEvidence) {
    const hasReason = (s.noEvidenceReason ?? '').trim().length > 0;
    const reasonAllowed =
      policy.allowNoEvidenceReason &&
      !!s.evidencePresence &&
      EVIDENCE_PRESENCE_WITHOUT_FILE.includes(s.evidencePresence);
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
  s: ValidatableSubmission,
  policy: Policy,
): { blocked: boolean; problems: Problem[] } {
  const problems = validateMinimal(s);
  if (policy.strictSubmissionValidation) {
    problems.push(...validateStrict(s, policy));
  }
  return { blocked: problems.length > 0, problems };
}
