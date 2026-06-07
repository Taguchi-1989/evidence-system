/** ダッシュボード：自分の提出一覧（全ロール共通の入口）。 */
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { statusLabel, statusVariant } from '@/lib/labels';
import { useAuth } from '@/auth/AuthContext';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { EVIDENCE_PRESENCE_LABELS, IMPACT_LEVEL_LABELS, CONTRIBUTION_LEVEL_LABELS } from '@evidence/shared';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['submissions', 'me', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.listSubmissions({ scope: 'me', fiscalYear: DEFAULT_FISCAL_YEAR }),
  });
  const items = data?.items ?? [];

  return (
    <div>
      <PageHeader
        title={messages.nav.dashboard}
        description={`${user?.name} さんの提出状況（${DEFAULT_FISCAL_YEAR}年度）`}
        actions={
          <Link to="/submissions/new">
            <Button>{messages.nav.newSubmission}</Button>
          </Link>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">読み込み中...</p>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              まだ提出はありません。「{messages.nav.newSubmission}」から記録を始めましょう。
            </div>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>{messages.fields.title}</TH>
                  <TH>{messages.fields.impactLevel}</TH>
                  <TH>{messages.fields.contributionLevel}</TH>
                  <TH>{messages.fields.evidencePresence}</TH>
                  <TH>{messages.fields.status}</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {items.map((s) => (
                  <TR key={s.submissionId}>
                    <TD className="font-medium">{s.title || '(無題)'}</TD>
                    <TD>{s.impactLevelSelf ? IMPACT_LEVEL_LABELS[s.impactLevelSelf] : '—'}</TD>
                    <TD>
                      {s.contributionLevelSelf
                        ? CONTRIBUTION_LEVEL_LABELS[s.contributionLevelSelf]
                        : '—'}
                    </TD>
                    <TD className="text-xs">{EVIDENCE_PRESENCE_LABELS[s.evidencePresence]}</TD>
                    <TD>
                      <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/submissions/${s.submissionId}`}>
                          <Button variant="ghost" size="sm">
                            詳細
                          </Button>
                        </Link>
                        {(s.status === 'draft' || s.status === 'returned') && (
                          <Link to={`/submissions/${s.submissionId}/edit`}>
                            <Button variant="outline" size="sm">
                              {messages.actions.edit}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
