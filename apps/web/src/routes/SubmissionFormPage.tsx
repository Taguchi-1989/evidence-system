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
  OPERATION_MODE_LABELS,
  DEFAULT_POLICY,
  validateForSubmit,
  type CreateSubmissionInput,
  type EvidencePresence,
  type ImpactLevel,
  type OperationMode,
  type Problem,
} from '@evidence/shared';
import { endpoints } from '@/lib/endpoints';
import { DEFAULT_FISCAL_YEAR } from '@/lib/constants';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/toast';
import { useUnsavedWarning } from '@/lib/useUnsavedWarning';
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
  const [problems, setProblems] = React.useState<Problem[]>([]);

  const { data: masters } = useQuery({
    queryKey: ['masters', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.masters(DEFAULT_FISCAL_YEAR),
  });

  // 運用モードのポリシーで入力の厳しさを自動切替（Trial/MVP=軽い, Strict=必須）
  const { data: policyCfg } = useQuery({
    queryKey: ['policy', DEFAULT_FISCAL_YEAR],
    queryFn: () => endpoints.policy(DEFAULT_FISCAL_YEAR),
  });
  const policy = policyCfg?.policy ?? DEFAULT_POLICY;
  const mode = (policyCfg?.mode ?? 'MVP') as OperationMode;
  const strict = policy.strictSubmissionValidation;
  const evidenceRequired = policy.evidenceRequired;

  // 詳細表示：Strict（必須化）または編集時は常に詳細。それ以外は任意で展開。
  const [detailedManual, setDetailedManual] = React.useState(false);
  const detailed = strict || isEdit || detailedManual;
  const req = (label: string) => (strict ? `${label} *` : label);

  const { data: existing } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => endpoints.getSubmission(id!),
    enabled: isEdit,
  });

  const { register, handleSubmit, reset, watch, formState } = useForm<FormValues>({
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

  // 未保存の変更があるままリロード/離脱しようとしたら警告
  useUnsavedWarning(formState.isDirty && !saving);

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
      reset(v); // 保存済み内容を基準にし、未保存(dirty)状態を解除
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
    // 運用モード連動の事前チェック（Strict は必須項目・証跡を要求）
    const check = validateForSubmit(
      {
        title: v.title,
        achievementText: v.achievementText,
        impactLevelSelf: v.impactLevelSelf ? Number(v.impactLevelSelf) : null,
        contributionLevelSelf: v.contributionLevelSelf ? Number(v.contributionLevelSelf) : null,
        hasEvidence: v.evidencePresence === 'AVAILABLE',
        evidencePresence: v.evidencePresence,
        noEvidenceReason: v.noEvidenceReason,
      },
      policy,
    );
    if (check.blocked) {
      setProblems(check.problems);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setProblems([]);
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
        title={isEdit ? messages.pages.submissionEdit : messages.nav.newSubmission}
        description={
          strict
            ? '本格運用モードです。必須項目（*）の入力と証跡が必要です。'
            : 'まずは要点だけでOK。後から「詳細入力」で説明や資料を足せます。'
        }
        actions={
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs text-secondary-foreground">
              運用モード: {OPERATION_MODE_LABELS[mode]}
            </span>
            {/* Strict / 編集時は詳細固定。それ以外は簡易/詳細を切替可能 */}
            {!strict && !isEdit && (
              <div className="flex rounded-md border p-0.5">
                <Button
                  type="button"
                  variant={!detailed ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDetailedManual(false)}
                >
                  {messages.form.easyInput}
                </Button>
                <Button
                  type="button"
                  variant={detailed ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDetailedManual(true)}
                >
                  {messages.form.detailedInput}
                </Button>
              </div>
            )}
          </div>
        }
      />

      {problems.length > 0 && (
        <Card className="mb-4 border-amber-300 bg-amber-50">
          <CardContent className="py-3 text-sm text-amber-800">
            <p className="mb-1 font-medium">提出に必要な項目をご確認ください：</p>
            <ul className="list-inside list-disc">
              {problems.map((p, i) => (
                <li key={i}>{p.message}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <form className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {detailed && (
              <>
                <Field label={messages.fields.department}>
                  <div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm text-muted-foreground">
                    {masters?.departments.find((d) => d.departmentId === user?.departmentId)?.name ??
                      user?.departmentId ??
                      '—'}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {messages.form.departmentReadonlyNote}
                  </p>
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
              <Field label={req(messages.fields.achievement)}>
                <Textarea
                  rows={4}
                  aria-label={messages.fields.achievement}
                  aria-required={strict}
                  {...register('achievementText')}
                />
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>影響度・貢献度</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field label={req(messages.fields.impactLevel)}>
              <Select
                aria-label={messages.fields.impactLevel}
                aria-required={strict}
                {...register('impactLevelSelf')}
              >
                <option value="">未選択</option>
                {IMPACT_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}. {IMPACT_LEVEL_LABELS[l]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={req(messages.fields.contributionLevel)}>
              <Select
                aria-label={messages.fields.contributionLevel}
                aria-required={strict}
                {...register('contributionLevelSelf')}
              >
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
            <p className="text-sm text-muted-foreground">
              {evidenceRequired
                ? 'この運用モードでは、証跡資料の添付（または証跡なし理由の入力）が必要です。'
                : messages.evidence.futureNote}
            </p>
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
