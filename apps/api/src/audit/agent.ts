/**
 * 夜間監査Agent（要件 §15）。一次チェック・確認補助・要確認抽出を行う。評価確定はしない。
 * ローカルは Lambda 単体相当で実行（将来 Step Functions 化しやすい構成）。
 */
import type { AuditResult, AuditRunSummary, Submission } from '@evidence/shared';
import { listByFiscalYear, getSubmission } from '../repositories/submissions.js';
import { listEvidence } from '../repositories/evidence.js';
import { saveAuditResult } from '../repositories/audit.js';
import { extractEvidence } from './extract.js';
import { scoreWithLLM, llmEnabled } from './llm.js';
import { id, nowIso } from '../lib/util.js';

interface RunOptions {
  fiscalYear: string;
  submissionId?: string;
}

export async function runAudit(opts: RunOptions): Promise<AuditRunSummary> {
  const startedAt = nowIso();
  const auditRunId = id('run');

  const submissions = opts.submissionId
    ? ([await getSubmission(opts.submissionId)].filter(Boolean) as Submission[])
    : (await listByFiscalYear(opts.fiscalYear)).filter((s) => s.status !== 'draft');

  let evidencesChecked = 0;
  let resultsWritten = 0;

  for (const s of submissions) {
    const evidences = await listEvidence(s.submissionId);
    const extracts = await Promise.all(evidences.map((ev) => extractEvidence(ev)));
    evidencesChecked += evidences.length;

    const unreadable = extracts.filter((e) => !e.readable).length;
    const texts = extracts.map((e) => e.text).filter((t): t is string => Boolean(t));

    const llm = evidences.length > 0 ? await scoreWithLLM(s, texts) : null;
    const result = determineResult(s, evidences.length, unreadable, llm?.relatedScore ?? null);

    const audit: AuditResult = {
      auditId: id('audit'),
      auditRunId,
      submissionId: s.submissionId,
      evidenceId: null,
      result,
      reason: buildReason(s, evidences.length, unreadable, llm?.reason),
      confidence: llm?.confidence ?? null,
      relatedScore: llm?.relatedScore ?? null,
      impactSupportScore: llm?.impactSupportScore ?? null,
      contributionSupportScore: llm?.contributionSupportScore ?? null,
      extractedSummary: llm?.extractedSummary ?? (texts[0] ? texts[0].slice(0, 200) : ''),
      citedLocation: '',
      checkedAt: nowIso(),
      modelName: llmEnabled() ? 'claude-haiku-4-5' : 'heuristic-v1',
      modelVersion: '1.0',
    };
    await saveAuditResult(audit, s.fiscalYear);
    resultsWritten++;
  }

  return {
    auditRunId,
    fiscalYear: opts.fiscalYear,
    startedAt,
    finishedAt: nowIso(),
    submissionsChecked: submissions.length,
    evidencesChecked,
    resultsWritten,
  };
}

/** 構造チェック（+ あれば LLM 関連度）から result コードを決める。 */
function determineResult(
  s: Submission,
  evidenceCount: number,
  unreadable: number,
  relatedScore: number | null,
): AuditResult['result'] {
  if (unreadable > 0) return 'UNREADABLE';

  if (evidenceCount > 0) {
    if (relatedScore == null) return 'REFERENCE_AVAILABLE';
    if (relatedScore >= 70) return 'OK';
    if (relatedScore >= 40) return 'NEED_REVIEW';
    return 'WEAK_EVIDENCE';
  }

  // ファイルなし：証跡有無の申告で判断（§9.2, §15.2）
  switch (s.evidencePresence) {
    case 'CONFIDENTIAL':
      return s.noEvidenceReason.trim() ? 'CONFIDENTIAL_NOT_ATTACHED' : 'NEED_REVIEW';
    case 'PREPARING':
      return 'PREPARING';
    default:
      return s.noEvidenceReason.trim() ? 'NEED_REVIEW' : 'NO_EVIDENCE';
  }
}

function buildReason(
  s: Submission,
  evidenceCount: number,
  unreadable: number,
  llmReason?: string,
): string {
  const parts: string[] = [];
  if (unreadable > 0) parts.push(`読み取れない資料が ${unreadable} 件あります。`);
  if (evidenceCount > 0) parts.push(`証跡資料 ${evidenceCount} 件を確認しました。`);
  else parts.push('添付された証跡資料はありません。');
  if (evidenceCount === 0 && s.noEvidenceReason.trim())
    parts.push('証跡なし理由が記録されています。');
  if (llmReason) parts.push(llmReason);
  return parts.join(' ');
}
