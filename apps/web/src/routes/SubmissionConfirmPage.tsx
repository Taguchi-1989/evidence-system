/** 提出確認画面。内容を確認して提出。ポリシー(strict)でブロックされた場合は理由を表示。 */
import * as React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/endpoints';
import { ApiRequestError } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { SubmissionSummary } from '@/components/SubmissionSummary';
import { EvidenceManager } from '@/components/EvidenceManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';

export function SubmissionConfirmPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [submitting, setSubmitting] = React.useState(false);
  const [problems, setProblems] = React.useState<{ path: string; message: string }[]>([]);

  const { data: s, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => endpoints.getSubmission(id!),
    enabled: Boolean(id),
  });

  if (isLoading || !s) return <Loading />;

  const handleSubmit = async () => {
    setSubmitting(true);
    setProblems([]);
    try {
      await endpoints.submitSubmission(s.submissionId);
      notify(messages.toast.submitted);
      void qc.invalidateQueries({ queryKey: ['submissions'] });
      void qc.invalidateQueries({ queryKey: ['submission', id] });
      navigate(`/submissions/${s.submissionId}`);
    } catch (e) {
      if (e instanceof ApiRequestError && e.details) setProblems(e.details);
      notify(e instanceof ApiRequestError ? e.message : messages.toast.error, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={messages.pages.confirmTitle}
        description={messages.pages.confirmDescription}
        actions={
          <Link to={`/submissions/${s.submissionId}/edit`}>
            <Button variant="outline">{messages.actions.edit}</Button>
          </Link>
        }
      />

      {problems.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50">
          <CardContent className="py-4 text-sm text-amber-800">
            <p className="mb-1 font-medium">以下をご確認ください：</p>
            <ul className="list-inside list-disc">
              {problems.map((p, i) => (
                <li key={i}>{p.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>提出内容</CardTitle>
        </CardHeader>
        <CardContent>
          <SubmissionSummary s={s} />
        </CardContent>
      </Card>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>添付資料</CardTitle>
        </CardHeader>
        <CardContent>
          <EvidenceManager submissionId={s.submissionId} editable={false} />
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={() => void handleSubmit()} disabled={submitting}>
          {submitting ? '提出中...' : messages.actions.submit}
        </Button>
      </div>
    </div>
  );
}
