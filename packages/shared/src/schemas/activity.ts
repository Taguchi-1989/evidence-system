/** 操作ログ（ActivityLog）スキーマ — 要件 §12.5 */
import { z } from 'zod';
import { RoleEnum } from '../enums.js';

export const ACTIVITY_ACTIONS = [
  'login',
  'submission.create',
  'submission.update',
  'submission.submit',
  'submission.approve',
  'submission.return',
  'submission.comment',
  'evidence.presign',
  'evidence.confirm',
  'evidence.register',
  'evidence.delete',
  'audit.run',
  'export.create',
  'policy.update',
  'master.update',
] as const;
export const ActivityActionEnum = z.enum(ACTIVITY_ACTIONS);
export type ActivityAction = z.infer<typeof ActivityActionEnum>;

export const ActivityLogSchema = z.object({
  eventId: z.string(),
  fiscalYear: z.string(),
  actorUserId: z.string(),
  actorRole: RoleEnum,
  action: ActivityActionEnum,
  targetType: z.string(),
  targetId: z.string(),
  beforeStatus: z.string().nullable(),
  afterStatus: z.string().nullable(),
  timestamp: z.string(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});
export type ActivityLog = z.infer<typeof ActivityLogSchema>;
