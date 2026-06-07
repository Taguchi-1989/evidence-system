/** 操作ログ記録ヘルパー（要件 §12.5, §17.1）。変更系操作で呼び出す。 */
import type { Context } from 'hono';
import type { ActivityAction } from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { saveActivity } from '../repositories/activity.js';
import { id, nowIso } from '../lib/util.js';

interface LogInput {
  fiscalYear: string;
  action: ActivityAction;
  targetType: string;
  targetId: string;
  beforeStatus?: string | null;
  afterStatus?: string | null;
}

export async function logActivity(c: Context<AppEnv>, input: LogInput): Promise<void> {
  const user = c.get('user');
  await saveActivity({
    eventId: id('evt'),
    fiscalYear: input.fiscalYear,
    actorUserId: user.userId,
    actorRole: user.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    beforeStatus: input.beforeStatus ?? null,
    afterStatus: input.afterStatus ?? null,
    timestamp: nowIso(),
    ipAddress:
      c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });
}
