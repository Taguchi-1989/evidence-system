/** 操作ログ（ActivityLog）リポジトリ。 */
import type { ActivityLog } from '@evidence/shared';
import { putItem, query } from '../db/ops.js';
import { activityKeys, yearLogPk } from '../db/keys.js';

const TYPE = 'ActivityLog';

export async function saveActivity(log: ActivityLog): Promise<void> {
  await putItem(
    TYPE,
    activityKeys({
      fiscalYear: log.fiscalYear,
      timestamp: log.timestamp,
      eventId: log.eventId,
      targetType: log.targetType,
      targetId: log.targetId,
    }),
    log,
  );
}

export async function listActivity(fiscalYear: string, limit = 200): Promise<ActivityLog[]> {
  return query<ActivityLog>(yearLogPk(fiscalYear), { descending: true, limit });
}
