/** エクスポート画面（要件 §10.4, §16）。CSV/JSON を作成しダウンロード。 */
import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

export function ExportPage() {
  const { notify } = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = React.useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['exports', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.listExports(DEFAULT_FISCAL_YEAR),
  });

  const create = async (format: 'csv' | 'json') => {
    setBusy(true);
    try {
      await endpoints.createExport({ fiscalYear: DEFAULT_FISCAL_YEAR, format });
      notify(messages.toast.exported);
      void qc.invalidateQueries({ queryKey: ['exports', DEFAULT_FISCAL_YEAR] });
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setBusy(false);
    }
  };

  const download = async (jobId: string) => {
    try {
      const { url } = await endpoints.exportDownloadUrl(jobId);
      window.open(url, '_blank');
    } catch {
      notify(messages.toast.error, 'error');
    }
  };

  return (
    <div>
      <PageHeader
        title={messages.pages.exportTitle}
        description={messages.pages.exportDescription}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void create('csv')} disabled={busy}>
              CSV作成
            </Button>
            <Button onClick={() => void create('json')} disabled={busy}>
              JSON作成
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">エクスポート履歴</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Loading />
          ) : (data?.items.length ?? 0) === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">
              まだエクスポートはありません。
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>形式</TH>
                  <TH>状態</TH>
                  <TH className="text-right">件数</TH>
                  <TH>作成日時</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {data?.items.map((job) => (
                  <TR key={job.exportJobId}>
                    <TD className="uppercase">{job.format}</TD>
                    <TD>
                      <Badge variant={job.status === 'completed' ? 'success' : 'muted'}>
                        {job.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">{job.recordCount ?? '—'}</TD>
                    <TD className="text-xs text-muted-foreground">{job.createdAt}</TD>
                    <TD className="text-right">
                      {job.status === 'completed' && (
                        <Button variant="ghost" size="sm" onClick={() => void download(job.exportJobId)}>
                          {messages.actions.download}
                        </Button>
                      )}
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
