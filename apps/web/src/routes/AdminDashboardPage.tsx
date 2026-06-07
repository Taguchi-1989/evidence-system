/** 管理ダッシュボード：提出状況・証跡状況・各種集計（要件 §10.2）。 */
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-bold">{value}</div>
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TBody>
            {rows.map((r, i) => (
              <TR key={i}>
                <TD className="text-sm">{r.label}</TD>
                <TD className="w-20 text-right font-medium">{r.count}</TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function AdminDashboardPage() {
  const { data: st, isLoading } = useQuery({
    queryKey: ['stats', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.stats(DEFAULT_FISCAL_YEAR),
  });

  if (isLoading || !st) {
    return (
      <div>
        <PageHeader title={messages.pages.adminTitle} />
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={messages.pages.adminTitle} description={`${st.fiscalYear}年度の状況`} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="提出総数" value={st.totalSubmissions} />
        <Stat
          label="提出済み人数"
          value={st.submittedUserCount}
          sub={`対象 ${st.expectedContributorCount} 名`}
        />
        <Stat label="未提出人数" value={st.notSubmittedUserCount} />
        <Stat label="承認済み" value={st.byStatus.approved} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="証跡あり" value={st.evidenceAggregates.available} />
        <Stat label="証跡なし" value={st.evidenceAggregates.none} />
        <Stat label="準備中" value={st.evidenceAggregates.preparing} />
        <Stat label="機密で未添付" value={st.evidenceAggregates.confidential} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="ステータス別"
          rows={[
            { label: '下書き', count: st.byStatus.draft },
            { label: '提出済み', count: st.byStatus.submitted },
            { label: '差戻し', count: st.byStatus.returned },
            { label: '承認済み', count: st.byStatus.approved },
          ]}
        />
        <Breakdown
          title="証跡有無別"
          rows={st.byEvidencePresence.map((r) => ({ label: r.label, count: r.count }))}
        />
        <Breakdown
          title="影響度別"
          rows={st.byImpactLevel.map((r) => ({ label: `${r.level}. ${r.label}`, count: r.count }))}
        />
        <Breakdown
          title="貢献度別"
          rows={st.byContributionLevel.map((r) => ({
            label: `${r.level}. ${r.label}`,
            count: r.count,
          }))}
        />
        {st.byEvidenceType.length > 0 && (
          <Breakdown
            title="証跡タイプ別"
            rows={st.byEvidenceType.map((r) => ({ label: r.label, count: r.count }))}
          />
        )}
        {st.byAuditResult.length > 0 && (
          <Breakdown
            title="監査結果別"
            rows={st.byAuditResult.map((r) => ({ label: r.label, count: r.count }))}
          />
        )}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-sm">部署別提出状況</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>部署</TH>
                <TH className="text-right">総数</TH>
                <TH className="text-right">提出済み</TH>
                <TH className="text-right">承認済み</TH>
              </TR>
            </THead>
            <TBody>
              {st.byDepartment.map((d) => (
                <TR key={d.departmentId}>
                  <TD>{d.name}</TD>
                  <TD className="text-right">{d.total}</TD>
                  <TD className="text-right">{d.submitted}</TD>
                  <TD className="text-right">{d.approved}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
