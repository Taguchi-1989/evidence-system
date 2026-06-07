/** 管理者ルート — 集計(§10.2)・ログ・未提出/要確認・監査結果の閲覧(§7 表示制御)。 */
import { Hono } from 'hono';
import { AuditRunRequestSchema, type AuthUser, type Policy } from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { notFound, parseBody, policyBlocked } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { assertCanView } from '../services/rbac.js';
import { computeStats } from '../services/stats.js';
import { getEffectivePolicy } from '../services/policy.js';
import { logActivity } from '../services/activity.js';
import { runAudit } from '../audit/agent.js';
import { listActivity } from '../repositories/activity.js';
import { listByFiscalYear, getSubmission } from '../repositories/submissions.js';
import { listAuditByYear, listAuditBySubmission } from '../repositories/audit.js';
import { listUsers } from '../repositories/users.js';
import { currentFiscalYear } from '../lib/util.js';

export const adminRouter = new Hono<AppEnv>();

function fy(c: { req: { query: (k: string) => string | undefined } }): string {
  return c.req.query('fiscalYear') ?? currentFiscalYear();
}

/** 監査結果をそのロールが見られるか（§7） */
function canSeeAudit(user: AuthUser, policy: Policy, isOwner: boolean): boolean {
  if (user.role === 'office' || user.role === 'auditor' || user.role === 'admin') return true;
  if (user.role === 'manager') return policy.auditResultVisibleToManager;
  if (user.role === 'contributor') return isOwner && policy.auditResultVisibleToUser;
  return false;
}

/** 集計（事務局・監査者・管理者） */
adminRouter.get(
  '/admin/stats',
  requireAuth,
  requireRole('office', 'auditor', 'admin'),
  async (c) => c.json(await computeStats(fy(c))),
);

/** 操作ログ（事務局・管理者） */
adminRouter.get('/admin/logs', requireAuth, requireRole('office', 'admin'), async (c) => {
  const items = await listActivity(fy(c));
  return c.json({ items });
});

/** 未提出・要確認一覧（事務局・管理者・上長） */
adminRouter.get(
  '/admin/pending',
  requireAuth,
  requireRole('office', 'admin', 'manager'),
  async (c) => {
    const fiscalYear = fy(c);
    const [submissions, users] = await Promise.all([listByFiscalYear(fiscalYear), listUsers()]);
    const submittedUserIds = new Set(
      submissions
        .filter((s) => s.status === 'submitted' || s.status === 'approved')
        .map((s) => s.userId),
    );
    const notSubmitted = users
      .filter((u) => u.role === 'contributor' && !submittedUserIds.has(u.userId))
      .map((u) => ({ userId: u.userId, name: u.name, departmentId: u.departmentId }));
    const pendingReview = submissions.filter((s) => s.status === 'submitted');
    return c.json({ notSubmitted, pendingReview });
  },
);

/** 年度の監査結果一覧（要確認画面）。manager は表示ポリシー依存。 */
adminRouter.get(
  '/admin/audit',
  requireAuth,
  requireRole('office', 'auditor', 'admin', 'manager'),
  async (c) => {
    const fiscalYear = fy(c);
    const { policy } = await getEffectivePolicy(fiscalYear);
    const user = c.get('user');
    if (!canSeeAudit(user, policy, false)) return c.json({ items: [], hidden: true });
    const items = await listAuditByYear(fiscalYear);
    return c.json({ items, hidden: false });
  },
);

/** 監査Agent 実行（事務局・管理者。auditAgentEnabled でゲート / §10.5, §15） */
adminRouter.post('/admin/audit/run', requireAuth, requireRole('office', 'admin'), async (c) => {
  const input = await parseBody(c, AuditRunRequestSchema);
  const { policy } = await getEffectivePolicy(input.fiscalYear);
  if (!policy.auditAgentEnabled) {
    throw policyBlocked('現在の運用ポリシーでは監査Agentが無効です');
  }
  const summary = await runAudit({ fiscalYear: input.fiscalYear, submissionId: input.submissionId });
  await logActivity(c, {
    fiscalYear: input.fiscalYear,
    action: 'audit.run',
    targetType: 'auditRun',
    targetId: summary.auditRunId,
  });
  return c.json(summary);
});

/** 提出単位の監査結果（RBAC + 表示ポリシー） */
adminRouter.get('/submissions/:id/audit', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanView(user, s);
  const { policy } = await getEffectivePolicy(s.fiscalYear);
  if (!canSeeAudit(user, policy, s.userId === user.userId)) {
    return c.json({ items: [], hidden: true });
  }
  const items = await listAuditBySubmission(s.submissionId);
  return c.json({ items, hidden: false });
});
