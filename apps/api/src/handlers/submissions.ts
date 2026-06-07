/** 提出（Submission）ルート — 要件 §10.1, §10.3。RBAC とポリシーを配線。 */
import { Hono } from 'hono';
import {
  CreateSubmissionSchema,
  UpdateSubmissionSchema,
  ReviewActionSchema,
  type Submission,
} from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { parseBody, notFound, conflict, policyBlocked } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import {
  saveSubmission,
  getSubmission,
  listByUser,
  listByDepartment,
  listByFiscalYear,
} from '../repositories/submissions.js';
import {
  assertCanEdit,
  assertCanReview,
  assertCanView,
  canViewSubmission,
  resolveListScope,
  type ListScope,
} from '../services/rbac.js';
import { getEffectivePolicy, validateForSubmit } from '../services/policy.js';
import { logActivity } from '../services/activity.js';
import { id, nowIso } from '../lib/util.js';

export const submissionsRouter = new Hono<AppEnv>();

function dedupeById(items: Submission[]): Submission[] {
  const map = new Map<string, Submission>();
  for (const s of items) map.set(s.submissionId, s);
  return [...map.values()];
}

/** 一覧（scope=me|department|all をロールで丸める） */
submissionsRouter.get('/submissions', requireAuth, async (c) => {
  const user = c.get('user');
  const fiscalYear = c.req.query('fiscalYear') ?? '';
  const status = c.req.query('status') as Submission['status'] | undefined;
  const scope = resolveListScope(user, c.req.query('scope') as ListScope | undefined);

  let items: Submission[];
  if (scope === 'all') {
    items = await listByFiscalYear(fiscalYear, status);
  } else if (scope === 'department') {
    const depts =
      user.role === 'manager'
        ? user.managedDepartmentIds.length
          ? user.managedDepartmentIds
          : [user.departmentId]
        : [c.req.query('departmentId') ?? user.departmentId];
    const lists = await Promise.all(depts.map((d) => listByDepartment(fiscalYear, d, status)));
    items = dedupeById(lists.flat());
  } else {
    items = await listByUser(user.userId, fiscalYear || undefined);
    if (status) items = items.filter((s) => s.status === status);
  }

  // 念のため RBAC で再フィルタ
  items = items.filter((s) => canViewSubmission(user, s));
  return c.json({ scope, items });
});

/** 新規作成（下書き） */
submissionsRouter.post('/submissions', requireAuth, async (c) => {
  const user = c.get('user');
  const input = await parseBody(c, CreateSubmissionSchema);
  const now = nowIso();
  const presence = input.evidencePresence ?? 'NONE';
  const s: Submission = {
    submissionId: id('sub'),
    fiscalYear: input.fiscalYear,
    userId: user.userId,
    departmentId: input.departmentId ?? user.departmentId,
    userName: input.userName ?? user.name,
    title: input.title ?? '',
    achievementText: input.achievementText ?? '',
    impactLevelSelf: input.impactLevelSelf ?? null,
    impactReason: input.impactReason ?? '',
    contributionLevelSelf: input.contributionLevelSelf ?? null,
    contributionReason: input.contributionReason ?? '',
    evidencePresence: presence,
    hasEvidence: presence === 'AVAILABLE',
    noEvidenceReason: input.noEvidenceReason ?? '',
    supplementaryComment: input.supplementaryComment ?? '',
    status: 'draft',
    reviewComment: '',
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
    approvedAt: null,
    approverId: null,
    deletedAt: null,
  };
  await saveSubmission(s);
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'submission.create',
    targetType: 'submission',
    targetId: s.submissionId,
    afterStatus: s.status,
  });
  return c.json(s, 201);
});

/** 1件取得 */
submissionsRouter.get('/submissions/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanView(user, s);
  return c.json(s);
});

/** 下書き更新 */
submissionsRouter.put('/submissions/:id', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanEdit(user, s);

  const input = await parseBody(c, UpdateSubmissionSchema);
  const merged: Submission = { ...s };
  for (const [k, v] of Object.entries(input)) {
    if (v !== undefined) (merged as Record<string, unknown>)[k] = v;
  }
  if (input.evidencePresence !== undefined) {
    merged.hasEvidence = input.evidencePresence === 'AVAILABLE';
  }
  merged.updatedAt = nowIso();
  await saveSubmission(merged);
  await logActivity(c, {
    fiscalYear: merged.fiscalYear,
    action: 'submission.update',
    targetType: 'submission',
    targetId: merged.submissionId,
  });
  return c.json(merged);
});

/** 提出（ポリシーに応じて strict バリデーション） */
submissionsRouter.post('/submissions/:id/submit', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanEdit(user, s);

  const { policy } = await getEffectivePolicy(s.fiscalYear);
  const { blocked, problems } = validateForSubmit(s, policy);
  if (blocked) {
    throw policyBlocked('提出に必要な項目が不足しています', problems);
  }

  const before = s.status;
  s.status = 'submitted';
  s.submittedAt = nowIso();
  s.updatedAt = s.submittedAt;
  await saveSubmission(s);
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'submission.submit',
    targetType: 'submission',
    targetId: s.submissionId,
    beforeStatus: before,
    afterStatus: s.status,
  });
  return c.json(s);
});

/** 承認 */
submissionsRouter.post('/submissions/:id/approve', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanReview(user, s);
  if (s.status !== 'submitted') throw conflict('提出済みの内容のみ承認できます');

  const input = await parseBody(c, ReviewActionSchema);
  const before = s.status;
  s.status = 'approved';
  s.approvedAt = nowIso();
  s.approverId = user.userId;
  s.reviewComment = input.comment ?? '';
  s.updatedAt = s.approvedAt;
  await saveSubmission(s);
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'submission.approve',
    targetType: 'submission',
    targetId: s.submissionId,
    beforeStatus: before,
    afterStatus: s.status,
  });
  return c.json(s);
});

/** 差戻し */
submissionsRouter.post('/submissions/:id/reject', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanReview(user, s);
  if (s.status !== 'submitted') throw conflict('提出済みの内容のみ差戻しできます');

  const input = await parseBody(c, ReviewActionSchema);
  const before = s.status;
  s.status = 'returned';
  s.reviewComment = input.comment ?? '';
  s.updatedAt = nowIso();
  await saveSubmission(s);
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'submission.return',
    targetType: 'submission',
    targetId: s.submissionId,
    beforeStatus: before,
    afterStatus: s.status,
  });
  return c.json(s);
});

/** コメント（確認者によるメモ） */
submissionsRouter.post('/submissions/:id/comment', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanReview(user, s);

  const input = await parseBody(c, ReviewActionSchema);
  s.reviewComment = input.comment ?? '';
  s.updatedAt = nowIso();
  await saveSubmission(s);
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'submission.comment',
    targetType: 'submission',
    targetId: s.submissionId,
  });
  return c.json(s);
});
