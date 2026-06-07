/** 監査結果画面（要件 §11.1）。Agent判定結果の確認 + 手動実行（事務局・管理者）。 */
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { auditLabel, auditVariant } from '@/lib/labels';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

export function AuditPage() {
  const { user } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [running, setRunning] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['year-audit', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.yearAudit(DEFAULT_FISCAL_YEAR),
  });

  const canRun = user?.role === 'office' || user?.role === 'admin';

  const handleRun = async () => {
    setRunning(true);
    try {
      const summary = await endpoints.runAudit({ fiscalYear: DEFAULT_FISCAL_YEAR });
      notify(`${messages.toast.auditDone}（${summary.resultsWritten}件）`);
      void qc.invalidateQueries({ queryKey: ['year-audit', DEFAULT_FISCAL_YEAR] });
      void qc.invalidateQueries({ queryKey: ['stats', DEFAULT_FISCAL_YEAR] });
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setRunning(false);
    }
  };

  const items = data && !data.hidden ? data.items : [];

  return (
    <div>
      <PageHeader
        title={messages.pages.auditTitle}
        description={messages.pages.auditDescription}
        actions={
          canRun ? (
            <Button onClick={() => void handleRun()} disabled={running}>
              {running ? '実行中...' : messages.actions.runAudit}
            </Button>
          ) : undefined
        }
      />

      {data?.hidden && (
        <Card className="mb-4">
          <CardContent className="py-4 text-sm text-muted-foreground">
            現在の運用ポリシーでは、監査結果はこのロールに表示されません。
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Loading />
          ) : items.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              監査結果はまだありません。「{messages.actions.runAudit}」で実行できます。
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>提出ID</TH>
                  <TH>判定</TH>
                  <TH className="text-right">関連度</TH>
                  <TH className="text-right">影響度対応</TH>
                  <TH className="text-right">貢献度対応</TH>
                  <TH>理由</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((a) => (
                  <TR key={a.auditId}>
                    <TD className="font-mono text-xs">{a.submissionId}</TD>
                    <TD>
                      <Badge variant={auditVariant(a.result)}>{auditLabel(a.result)}</Badge>
                    </TD>
                    <TD className="text-right">{a.relatedScore ?? '—'}</TD>
                    <TD className="text-right">{a.impactSupportScore ?? '—'}</TD>
                    <TD className="text-right">{a.contributionSupportScore ?? '—'}</TD>
                    <TD className="max-w-xs text-xs text-muted-foreground">{a.reason}</TD>
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
