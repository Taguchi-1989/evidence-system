/**
 * 夜間監査Agent（要件 §15）。一次チェック・確認補助・要確認抽出を行う。評価確定はしない。
 * ローカルは Lambda 単体相当で実行（将来 Step Functions 化しやすい構成）。
 *
 * 出力は2層:
 *  - ファイル単位: 読取可否 / タイプ・形式の整合（§15.2）
 *  - 提出単位: 全体サマリー（+ LLM 任意で関連度スコア §15.3）
 */
import type { AuditResult, AuditRunSummary, EvidenceFile, Submission } from '@evidence/shared';
import { extractExtension } from '@evidence/shared';
import { listByFiscalYear, getSubmission } from '../repositories/submissions.js';
import { listEvidence } from '../repositories/evidence.js';
import { saveAuditResult } from '../repositories/audit.js';
import { extractEvidence, type ExtractResult } from './extract.js';
import { checkTypeConsistency } from './consistency.js';
import { scoreWithLLM, llmEnabled, llmModelName } from './llm.js';
import { id, nowIso } from '../lib/util.js';

interface RunOptions {
  fiscalYear: string;
  submissionId?: string;
}

const MODEL_NAME = () => llmModelName();

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

    // ── ファイル単位の監査結果（§15.2 ファイルが読めるか / タイプ整合）──
    let unreadable = 0;
    let inconsistent = 0;
    for (let i = 0; i < evidences.length; i++) {
      const ev = evidences[i]!;
      const ex = extracts[i]!;
      if (!ex.readable) unreadable++;
      const consistency = checkTypeConsistency(ev.evidenceType, extractExtension(ev.originalFileName));
      if (!consistency.consistent) inconsistent++;

      const fileResult = perFileResult(ex, consistency.consistent);
      const fileAudit: AuditResult = {
        auditId: id('audit'),
        auditRunId,
        submissionId: s.submissionId,
        evidenceId: ev.evidenceId,
        result: fileResult,
        reason: perFileReason(ex, consistency.consistent, consistency.note),
        confidence: null,
        relatedScore: null,
        impactSupportScore: null,
        contributionSupportScore: null,
        extractedSummary: ex.text ? ex.text.slice(0, 200) : '',
        citedLocation: `ファイル: ${ev.originalFileName}`,
        checkedAt: nowIso(),
        modelName: 'heuristic-v2',
        modelVersion: '2.0',
      };
      await saveAuditResult(fileAudit, s.fiscalYear);
      resultsWritten++;
    }

    // ── 提出単位のサマリー（+ LLM 任意）──
    const texts = extracts.map((e) => e.text).filter((t): t is string => Boolean(t));
    const llm = evidences.length > 0 ? await scoreWithLLM(s, texts) : null;
    const summaryResult = determineSummaryResult(
      s,
      evidences.length,
      unreadable,
      llm?.relatedScore ?? null,
    );

    const summary: AuditResult = {
      auditId: id('audit'),
      auditRunId,
      submissionId: s.submissionId,
      evidenceId: null,
      result: summaryResult,
      reason: buildSummaryReason(s, evidences.length, unreadable, inconsistent, llm?.reason),
      confidence: llm?.confidence ?? null,
      relatedScore: llm?.relatedScore ?? null,
      impactSupportScore: llm?.impactSupportScore ?? null,
      contributionSupportScore: llm?.contributionSupportScore ?? null,
      extractedSummary: llm?.extractedSummary ?? (texts[0] ? texts[0].slice(0, 200) : ''),
      citedLocation: '',
      checkedAt: nowIso(),
      modelName: MODEL_NAME(),
      modelVersion: llmEnabled() ? '1.0' : '2.0',
    };
    await saveAuditResult(summary, s.fiscalYear);
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

function perFileResult(ex: ExtractResult, consistent: boolean): AuditResult['result'] {
  if (!ex.readable) return 'UNREADABLE';
  if (!consistent) return 'NEED_REVIEW';
  return 'REFERENCE_AVAILABLE';
}

function perFileReason(ex: ExtractResult, consistent: boolean, note: string): string {
  if (!ex.readable) return 'ファイルを読み取れませんでした。';
  const parts = [ex.kind === 'text' ? 'テキストを抽出しました。' : '読み取り可能です。'];
  if (!consistent) parts.push(note);
  return parts.join(' ');
}

/** 提出全体の result コードを決める（+ あれば LLM 関連度）。 */
function determineSummaryResult(
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

  const reason = (s.noEvidenceReason ?? '').trim();
  switch (s.evidencePresence) {
    case 'CONFIDENTIAL':
      return reason ? 'CONFIDENTIAL_NOT_ATTACHED' : 'NEED_REVIEW';
    case 'PREPARING':
      return 'PREPARING';
    default:
      return reason ? 'NEED_REVIEW' : 'NO_EVIDENCE';
  }
}

function buildSummaryReason(
  s: Submission,
  evidenceCount: number,
  unreadable: number,
  inconsistent: number,
  llmReason?: string,
): string {
  const parts: string[] = [];
  if (evidenceCount > 0) parts.push(`証跡資料 ${evidenceCount} 件を確認しました。`);
  else parts.push('添付された証跡資料はありません。');
  if (unreadable > 0) parts.push(`うち ${unreadable} 件は読み取れません。`);
  if (inconsistent > 0) parts.push(`うち ${inconsistent} 件はタイプと形式が一致しない可能性があります。`);
  if (evidenceCount === 0 && (s.noEvidenceReason ?? '').trim())
    parts.push('証跡なし理由が記録されています。');
  if (llmReason) parts.push(llmReason);
  return parts.join(' ');
}
