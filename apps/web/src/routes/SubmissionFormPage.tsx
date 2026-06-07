/** 達成内容入力 + 証跡添付（新規/編集兼用）。要件 §10.1, §11.2 柔らかい表現。 */
import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  EVIDENCE_PRESENCES,
  EVIDENCE_PRESENCE_LABELS,
  IMPACT_LEVELS,
  IMPACT_LEVEL_LABELS,
  CONTRIBUTION_LEVELS,
  CONTRIBUTION_LEVEL_LABELS,
  type CreateSubmissionInput,
  type EvidencePresence,
  type ImpactLevel,
} from '@evidence/shared';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { PageHeader } from '@/components/PageHeader';
import { EvidenceManager } from '@/components/EvidenceManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface FormValues {
  departmentId: string;
  userName: string;
  title: string;
  achievementText: string;
  impactLevelSelf: string;
  impactReason: string;
  contributionLevelSelf: string;
  contributionReason: string;
  evidencePresence: EvidencePresence;
  noEvidenceReason: string;
  supplementaryComment: string;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function SubmissionFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();
  const [saving, setSaving] = React.useState(false);
  // 入力導線：簡易（はじめは軽く）/ 詳細（しっかり）。編集時は詳細を既定に。
  const [detailed, setDetailed] = React.useState(false);
  React.useEffect(() => {
    if (isEdit) setDetailed(true);
  }, [isEdit]);

  const { data: masters } = useQuery({
    queryKey: ['masters', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.masters(DEFAULT_FISCAL_YEAR),
  });

  const { data: existing } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => endpoints.getSubmission(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, watch } = useForm<FormValues>({
    defaultValues: {
      departmentId: user?.departmentId ?? '',
      userName: user?.name ?? '',
      title: '',
      achievementText: '',
      impactLevelSelf: '',
      impactReason: '',
      contributionLevelSelf: '',
      contributionReason: '',
      evidencePresence: 'AVAILABLE',
      noEvidenceReason: '',
      supplementaryComment: '',
    },
  });

  React.useEffect(() => {
    if (existing) {
      reset({
        departmentId: existing.departmentId,
        userName: existing.userName,
        title: existing.title,
        achievementText: existing.achievementText,
        impactLevelSelf: existing.impactLevelSelf ? String(existing.impactLevelSelf) : '',
        impactReason: existing.impactReason,
        contributionLevelSelf: existing.contributionLevelSelf
          ? String(existing.contributionLevelSelf)
          : '',
        contributionReason: existing.contributionReason,
        evidencePresence: existing.evidencePresence,
        noEvidenceReason: existing.noEvidenceReason,
        supplementaryComment: existing.supplementaryComment,
      });
    }
  }, [existing, reset]);

  const presence = watch('evidencePresence');

  const toPayload = (v: FormValues): CreateSubmissionInput => ({
    fiscalYear: DEFAULT_FISCAL_YEAR,
    departmentId: v.departmentId,
    userName: v.userName,
    title: v.title,
    achievementText: v.achievementText,
    impactLevelSelf: v.impactLevelSelf ? (Number(v.impactLevelSelf) as ImpactLevel) : undefined,
    impactReason: v.impactReason,
    contributionLevelSelf: v.contributionLevelSelf
      ? (Number(v.contributionLevelSelf) as ImpactLevel)
      : undefined,
    contributionReason: v.contributionReason,
    evidencePresence: v.evidencePresence,
    noEvidenceReason: v.noEvidenceReason,
    supplementaryComment: v.supplementaryComment,
  });

  /** 保存して submissionId を返す（新規なら作成、編集なら更新） */
  const persist = async (v: FormValues): Promise<string> => {
    if (isEdit && id) {
      await endpoints.updateSubmission(id, toPayload(v));
      void qc.invalidateQueries({ queryKey: ['submission', id] });
      return id;
    }
    const created = await endpoints.createSubmission(toPayload(v));
    return created.submissionId;
  };

  const onSaveDraft = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const sid = await persist(v);
      notify(messages.toast.saved);
      void qc.invalidateQueries({ queryKey: ['submissions'] });
      if (!isEdit) navigate(`/submissions/${sid}/edit`, { replace: true });
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setSaving(false);
    }
  });

  const onGoConfirm = handleSubmit(async (v) => {
    setSaving(true);
    try {
      const sid = await persist(v);
      navigate(`/submissions/${sid}/confirm`);
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setSaving(false);
    }
  });

  return (
    <div>
      <PageHeader
        title={isEdit ? '達成内容の編集' : messages.nav.newSubmission}
        description={
          detailed
            ? '影響度と貢献度を分けて記録し、説明や資料も添付できます。'
            : 'まずは要点だけ。後から「詳細入力」で説明や資料を足せます。'
        }
        actions={
          <div className="flex rounded-md border p-0.5">
            <Button
              type="button"
              variant={!detailed ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDetailed(false)}
            >
              かんたん入力
            </Button>
            <Button
              type="button"
              variant={detailed ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDetailed(true)}
            >
              詳細入力
            </Button>
          </div>
        }
      />

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {detailed && (
              <>
                <Field label={messages.fields.department}>
                  <Select {...register('departmentId')}>
                    {masters?.departments.map((d) => (
                      <option key={d.departmentId} value={d.departmentId}>
                        {d.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label={messages.fields.userName}>
                  <Input {...register('userName')} />
                </Field>
              </>
            )}
            <div className="sm:col-span-2">
              <Field label={messages.fields.title}>
                <Input
                  {...register('title')}
                  aria-label={messages.fields.title}
                  placeholder="例：月次集計作業の自動化"
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={messages.fields.achievement}>
                <Textarea rows={4} aria-label={messages.fields.achievement} {...register('achievementText')} />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>影響度・貢献度</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={messages.fields.impactLevel}>
              <Select aria-label={messages.fields.impactLevel} {...register('impactLevelSelf')}>
                <option value="">未選択</option>
                {IMPACT_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}. {IMPACT_LEVEL_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={messages.fields.contributionLevel}>
              <Select aria-label={messages.fields.contributionLevel} {...register('contributionLevelSelf')}>
                <option value="">未選択</option>
                {CONTRIBUTION_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}. {CONTRIBUTION_LEVEL_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>
            {detailed && (
              <>
                <Field label={messages.fields.impactReason}>
                  <Textarea rows={3} {...register('impactReason')} />
                </Field>
                <Field label={messages.fields.contributionReason}>
                  <Textarea rows={3} {...register('contributionReason')} />
                </Field>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>証跡資料</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{messages.evidence.futureNote}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={messages.fields.evidencePresence}>
                <Select {...register('evidencePresence')}>
                  {EVIDENCE_PRESENCES.map((p) => (
                    <option key={p} value={p}>
                      {EVIDENCE_PRESENCE_LABELS[p]}
                    </option>
                  ))}
                </Select>
              </Field>
              {presence !== 'AVAILABLE' && (
                <Field label={messages.evidence.noEvidenceReasonLabel}>
                  <Input {...register('noEvidenceReason')} placeholder={messages.evidence.confidentialNote} />
                </Field>
              )}
            </div>
            {detailed && (
              <>
                <Field label={messages.fields.supplementaryComment}>
                  <Textarea rows={2} {...register('supplementaryComment')} />
                </Field>

                {isEdit && id ? (
                  <div className="border-t pt-4">
                    <h4 className="mb-3 text-sm font-medium">添付資料</h4>
                    <EvidenceManager submissionId={id} editable />
                  </div>
                ) : (
                  <p className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                    資料の添付は、下書き保存の後（詳細入力）で行えます。
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => void onSaveDraft()} disabled={saving}>
            {messages.actions.save}
          </Button>
          <Button type="button" onClick={() => void onGoConfirm()} disabled={saving}>
            {messages.actions.confirm}
          </Button>
        </div>
      </form>
    </div>
  );
}
