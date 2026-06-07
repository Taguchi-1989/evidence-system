/** バブル選択時の詳細パネル（Plotly のクリック詳細に相当）。 */
import { Link } from 'react-router-dom';
import type { Submission } from '@evidence/shared';
import { EVIDENCE_PRESENCE_LABELS } from '@evidence/shared';
import { deriveAttributes } from '@/routes/bi/bi-config';
import { statusLabel, statusVariant } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function BubbleDetail({
  submission,
  deptName,
}: {
  submission: Submission;
  deptName: (id: string) => string;
}) {
  const s = submission;
  const attrs = deriveAttributes(s, deptName);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold leading-snug">{s.title || '(無題)'}</h3>
        <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        {s.userName} ・ {deptName(s.departmentId)}
      </p>

      {s.achievementText && (
        <p className="whitespace-pre-line rounded-md bg-muted/50 p-2 text-xs leading-relaxed">
          {s.achievementText}
        </p>
      )}

      <dl className="divide-y text-xs">
        {attrs.map((a) => (
          <div key={a.label} className="flex items-center justify-between gap-2 py-1.5">
            <dt className="text-muted-foreground">
              {a.label}
              {a.estimated && (
                <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-700">推定</span>
              )}
            </dt>
            <dd className="text-right font-medium">{a.value}</dd>
          </div>
        ))}
      </dl>

      {(s.impactReason || s.contributionReason) && (
        <div className="space-y-1 text-xs text-muted-foreground">
          {s.impactReason && <p>影響度の説明: {s.impactReason}</p>}
          {s.contributionReason && <p>貢献度の説明: {s.contributionReason}</p>}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        証跡: {EVIDENCE_PRESENCE_LABELS[s.evidencePresence]}
      </p>

      <Link to={`/submissions/${s.submissionId}`}>
        <Button variant="outline" size="sm" className="w-full">
          提出の詳細を開く
        </Button>
      </Link>
    </div>
  );
}
