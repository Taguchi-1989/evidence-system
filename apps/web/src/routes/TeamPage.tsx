/** 部門一覧（上長）。配下部署の提出状況を確認（要件 §11.1）。 */
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { SubmissionTable } from '@/components/SubmissionTable';
import { Card, CardContent } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';

export function TeamPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['submissions', 'department', DEFAULT_FISCAL_YEAR],
    queryFn: () =>
      endpoints.listSubmissions({ scope: 'department', fiscalYear: DEFAULT_FISCAL_YEAR }),
  });

  return (
    <div>
      <PageHeader title={messages.pages.teamTitle} description={messages.pages.teamDescription} />
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <Loading />
          ) : (
            <SubmissionTable items={data?.items ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
