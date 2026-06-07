/** 未提出・要確認一覧（要件 §11.1）。督促・確認対象を抽出。 */
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { SubmissionTable } from '@/components/SubmissionTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

export function PendingPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['pending', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.pending(DEFAULT_FISCAL_YEAR),
  });

  return (
    <div>
      <PageHeader title={messages.pages.pendingTitle} description={messages.pages.pendingDescription} />

      {isLoading || !data ? (
        <Loading />
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">未提出者（{data.notSubmitted.length} 名）</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {data.notSubmitted.length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">未提出者はいません。</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>氏名</TH>
                      <TH>部署</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {data.notSubmitted.map((u) => (
                      <TR key={u.userId}>
                        <TD>{u.name}</TD>
                        <TD className="text-xs">{u.departmentId}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                確認待ち（提出済み・未承認 {data.pendingReview.length} 件）
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <SubmissionTable items={data.pendingReview} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
