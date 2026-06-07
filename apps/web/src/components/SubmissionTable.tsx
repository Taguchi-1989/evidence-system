import { Link } from 'react-router-dom';
import type { Submission } from '@evidence/shared';
import { EVIDENCE_PRESENCE_LABELS } from '@evidence/shared';
import { statusLabel, statusVariant } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { messages } from '@/i18n/messages';

export function SubmissionTable({ items }: { items: Submission[] }) {
  if (items.length === 0) {
    return <p className="p-5 text-sm text-muted-foreground">該当する提出はありません。</p>;
  }
  return (
    <Table>
      <THead>
        <TR>
          <TH>{messages.fields.title}</TH>
          <TH>{messages.fields.userName}</TH>
          <TH>{messages.fields.department}</TH>
          <TH>{messages.fields.evidencePresence}</TH>
          <TH>{messages.fields.status}</TH>
          <TH></TH>
        </TR>
      </THead>
      <TBody>
        {items.map((s) => (
          <TR key={s.submissionId}>
            <TD className="font-medium">{s.title || '(無題)'}</TD>
            <TD>{s.userName}</TD>
            <TD className="text-xs">{s.departmentId}</TD>
            <TD className="text-xs">{EVIDENCE_PRESENCE_LABELS[s.evidencePresence]}</TD>
            <TD>
              <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
            </TD>
            <TD className="text-right">
              <Link to={`/submissions/${s.submissionId}`}>
                <Button variant="ghost" size="sm">
                  詳細
                </Button>
              </Link>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
