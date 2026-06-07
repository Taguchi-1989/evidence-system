/** 提出詳細。閲覧 + 監査結果 + 確認者向けの承認・差戻し・コメント（要件 §10.3）。 */
import * as React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthUser, Submission } from '@evidence/shared';
import { ROLE_LABELS } from '@evidence/shared';
import { endpoints } from '@/lib/endpoints';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { statusLabel, statusVariant, auditLabel, auditVariant } from '@/lib/labels';
import { PageHeader } from '@/components/PageHeader';
import { SubmissionSummary } from '@/components/SubmissionSummary';
import { EvidenceManager } from '@/components/EvidenceManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

function canReview(user: AuthUser, s: Submission): boolean {
  if (user.role === 'office' || user.role === 'admin') return true;
  if (user.role === 'manager')
    return user.departmentId === s.departmentId || user.managedDepartmentIds.includes(s.departmentId);
  return false;
}

export function SubmissionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [comment, setComment] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  const { data: s, isLoading } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => endpoints.getSubmission(id!),
    enabled: Boolean(id),
  });
  const { data: audit } = useQuery({
    queryKey: ['submission-audit', id],
    queryFn: () => endpoints.submissionAudit(id!),
    enabled: Boolean(id),
  });

  if (isLoading || !s || !user) return <Loading />;

  const isOwner = s.userId === user.userId;
  const reviewer = canReview(user, s);
  const auditItems = audit && !audit.hidden ? audit.items : [];

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      notify(msg);
      void qc.invalidateQueries({ queryKey: ['submission', id] });
      void qc.invalidateQueries({ queryKey: ['submissions'] });
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={s.title || messages.common.untitled}
        description={`${s.userName} ・ ${s.departmentId}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusVariant(s.status)}>{statusLabel(s.status)}</Badge>
            {isOwner && (s.status === 'draft' || s.status === 'returned') && (
              <Link to={`/submissions/${s.submissionId}/edit`}>
                <Button variant="outline" size="sm">
                  {messages.actions.edit}
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {(s.reviewHistory?.length ?? 0) > 0 ? (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{messages.review.historyTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {s.reviewHistory!.map((e, i) => (
              <div key={i} className="border-l-2 border-muted pl-3 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="muted">{messages.review.actionLabels[e.action]}</Badge>
                  <span>
                    {e.actorName}（{ROLE_LABELS[e.actorRole as keyof typeof ROLE_LABELS] ?? e.actorRole}）
                  </span>
                  <span>{new Date(e.at).toLocaleString('ja-JP')}</span>
                </div>
                {e.comment && <p className="mt-0.5">{e.comment}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        s.reviewComment && (
          <Card className="mb-4">
            <CardContent className="py-3 text-sm">
              <span className="text-muted-foreground">{messages.review.latestCommentLabel}</span>{' '}
              {s.reviewComment}
            </CardContent>
          </Card>
        )
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
          <EvidenceManager
            submissionId={s.submissionId}
            editable={isOwner && (s.status === 'draft' || s.status === 'returned')}
          />
        </CardContent>
      </Card>

      {auditItems.length > 0 && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>監査Agent 結果（参考）</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              これは最終評価ではなく、確認の補助となる参考情報です。
            </p>
            {auditItems.map((a) => (
              <div key={a.auditId} className="rounded-md border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant={auditVariant(a.result)}>{auditLabel(a.result)}</Badge>
                  {a.relatedScore != null && (
                    <span className="text-xs text-muted-foreground">関連度 {a.relatedScore}%</span>
                  )}
                </div>
                <p className="text-muted-foreground">{a.reason}</p>
                {a.extractedSummary && (
                  <p className="mt-1 text-xs text-muted-foreground">抽出: {a.extractedSummary}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {reviewer && s.status === 'submitted' && (
        <Card className="mt-4 border-primary/30">
          <CardHeader>
            <CardTitle>{messages.pages.detailReview}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={2}
              placeholder="コメント（任意）"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                disabled={busy}
                onClick={() =>
                  void act(() => endpoints.approveSubmission(s.submissionId, comment), messages.toast.approved)
                }
              >
                {messages.actions.approve}
              </Button>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void act(() => endpoints.rejectSubmission(s.submissionId, comment), messages.toast.rejected)
                }
              >
                {messages.actions.reject}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
