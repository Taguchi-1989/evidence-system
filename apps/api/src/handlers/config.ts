/** ポリシー/モード・マスタのルート（要件 §7, §11.1 マスタ管理）。 */
import { Hono } from 'hono';
import { z } from 'zod';
import {
  OperationModeEnum,
  PolicySchema,
  UpsertDepartmentSchema,
  buildStaticMasters,
  type MastersResponse,
} from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { config } from '../config.js';
import { parseBody } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getEffectivePolicy } from '../services/policy.js';
import { getPolicyConfig, savePolicyConfig } from '../repositories/config.js';
import { listDepartments, putDepartment } from '../repositories/departments.js';
import { logActivity } from '../services/activity.js';
import { nowIso, currentFiscalYear } from '../lib/util.js';

export const configRouter = new Hono<AppEnv>();

function fy(c: { req: { query: (k: string) => string | undefined } }): string {
  return c.req.query('fiscalYear') ?? currentFiscalYear();
}

/**
 * アプリ実行情報（認証方式・ストレージ方式）。認証不要。
 * フロントは mock 認証時に注意バナーを出すためにこれを参照する。
 */
configRouter.get('/config/app', (c) =>
  c.json({ authProvider: config.auth.provider, storageDriver: config.storage.driver }),
);

/** 有効ポリシー（フロントが UI 文言/必須表示を切替えるために取得） */
configRouter.get('/config/policy', requireAuth, async (c) => {
  const eff = await getEffectivePolicy(fy(c));
  return c.json(eff);
});

/** マスタ（部署 + 固定選択肢） */
configRouter.get('/masters', requireAuth, async (c) => {
  const departments = await listDepartments(fy(c));
  const body: MastersResponse = { departments, ...buildStaticMasters() };
  return c.json(body);
});

/** ポリシー/モード更新（システム管理者のみ） */
const UpdatePolicySchema = z.object({
  fiscalYear: z.string().min(4),
  mode: OperationModeEnum,
  overrides: PolicySchema.partial().optional().default({}),
});
configRouter.put('/admin/config/policy', requireAuth, requireRole('admin'), async (c) => {
  const input = await parseBody(c, UpdatePolicySchema);
  const before = await getPolicyConfig(input.fiscalYear);
  const saved = await savePolicyConfig({
    fiscalYear: input.fiscalYear,
    mode: input.mode,
    overrides: input.overrides,
    updatedAt: nowIso(),
    updatedBy: c.get('user').userId,
  });
  await logActivity(c, {
    fiscalYear: input.fiscalYear,
    action: 'policy.update',
    targetType: 'policy',
    targetId: input.fiscalYear,
    beforeStatus: before.mode,
    afterStatus: saved.mode,
  });
  return c.json(saved);
});

/** 部署マスタ upsert（システム管理者のみ） */
configRouter.put('/admin/masters/department', requireAuth, requireRole('admin'), async (c) => {
  const input = await parseBody(c, UpsertDepartmentSchema.extend({ fiscalYear: z.string().min(4) }));
  const dept = await putDepartment(input.fiscalYear, {
    departmentId: input.departmentId,
    name: input.name,
    parentDepartmentId: input.parentDepartmentId ?? null,
  });
  await logActivity(c, {
    fiscalYear: input.fiscalYear,
    action: 'master.update',
    targetType: 'department',
    targetId: dept.departmentId,
  });
  return c.json(dept);
});
