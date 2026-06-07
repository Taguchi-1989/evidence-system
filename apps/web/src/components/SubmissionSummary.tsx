/** 提出内容の読み取り表示（確認画面・詳細画面で共用）。 */
import {
  EVIDENCE_PRESENCE_LABELS,
  IMPACT_LEVEL_LABELS,
  CONTRIBUTION_LEVEL_LABELS,
  type Submission,
} from '@evidence/shared';
import { messages } from '@/i18n/messages';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 whitespace-pre-line text-sm">{value || '—'}</dd>
    </div>
  );
}

export function SubmissionSummary({ s }: { s: Submission }) {
  return (
    <dl className="divide-y">
      <Row label={messages.fields.title} value={s.title} />
      <Row label={messages.fields.department} value={s.departmentId} />
      <Row label={messages.fields.userName} value={s.userName} />
      <Row label={messages.fields.achievement} value={s.achievementText} />
      <Row
        label={messages.fields.impactLevel}
        value={s.impactLevelSelf ? `${s.impactLevelSelf}. ${IMPACT_LEVEL_LABELS[s.impactLevelSelf]}` : '—'}
      />
      <Row label={messages.fields.impactReason} value={s.impactReason} />
      <Row
        label={messages.fields.contributionLevel}
        value={
          s.contributionLevelSelf
            ? `${s.contributionLevelSelf}. ${CONTRIBUTION_LEVEL_LABELS[s.contributionLevelSelf]}`
            : '—'
        }
      />
      <Row label={messages.fields.contributionReason} value={s.contributionReason} />
      <Row label={messages.fields.evidencePresence} value={EVIDENCE_PRESENCE_LABELS[s.evidencePresence]} />
      {s.noEvidenceReason && <Row label={messages.fields.noEvidenceReason} value={s.noEvidenceReason} />}
      <Row label={messages.fields.supplementaryComment} value={s.supplementaryComment} />
    </dl>
  );
}
