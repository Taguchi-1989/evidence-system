/** 一括取込ルート（要件 §取込）。XLSX/CSV を presigned URL で受け取り、Submission を作成。 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../types.js';
import { parseBody, badRequest } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { presignUpload } from '../storage/objects.js';
import { importSubmissions } from '../services/import.js';
import { logActivity } from '../services/activity.js';
import { config } from '../config.js';
import { id } from '../lib/util.js';

export const importRouter = new Hono<AppEnv>();

const ALLOWED = ['xlsx', 'csv'];

const PresignSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive().max(20 * 1024 * 1024),
});

/** 取込ファイルのアップロードURL発行 */
importRouter.post('/admin/import/presign', requireAuth, requireRole('office', 'admin'), async (c) => {
  const input = await parseBody(c, PresignSchema);
  const ext = input.fileName.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED.includes(ext)) throw badRequest('取込は xlsx / csv のみ対応です');
  const s3Key = `imports/${id('imp')}.${ext}`;
  const uploadUrl = await presignUpload(s3Key, input.contentType);
  return c.json({ uploadUrl, s3Key, expiresIn: config.s3.presignExpires });
});

const ImportSchema = z.object({
  fiscalYear: z.string().min(4),
  // presign が発行したキーのみ許可（任意キー読取を防止）
  s3Key: z.string().regex(/^imports\/imp-[A-Za-z0-9-]+\.(xlsx|csv)$/, {
    message: 's3Key は取込用 presign で発行されたものを指定してください',
  }),
  dryRun: z.boolean().optional().default(true),
});

/** 取込実行（dryRun=true で検証のみ） */
importRouter.post('/admin/import', requireAuth, requireRole('office', 'admin'), async (c) => {
  const input = await parseBody(c, ImportSchema);
  const result = await importSubmissions(input);
  if (!result.dryRun) {
    await logActivity(c, {
      fiscalYear: input.fiscalYear,
      action: 'submission.create',
      targetType: 'import',
      targetId: input.s3Key,
      afterStatus: `created:${result.created}`,
    });
  }
  return c.json(result);
});
