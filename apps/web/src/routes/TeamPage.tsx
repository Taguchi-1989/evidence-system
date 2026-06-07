/** 部門一覧（上長）。配下部署の提出状況を確認（要件 §11.1）。 */
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { PageHeader } from '@/components/PageHeader';
import { SubmissionTable } from '@/components/SubmissionTable';
import { Card, CardContent } from '@/components/ui/card';

export function TeamPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['submissions', 'department', DEFAULT_FISCAL_YEAR],
    queryFn: () =>
      endpoints.listSubmissions({ scope: 'department', fiscalYear: DEFAULT_FISCAL_YEAR }),
  });

  return (
    <div>
      <PageHeader title="部門一覧" description="配下部署の提出状況を確認できます。" />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-5 text-sm text-muted-foreground">読み込み中...</p>
          ) : (
            <SubmissionTable items={data?.items ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
