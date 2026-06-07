/** エクスポートルート（要件 §10.4, §16）。MVP はジョブを同期処理して S3 に出力。 */
import { Hono } from 'hono';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { CreateExportSchema, type ExportJob } from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { parseBody, notFound, policyBlocked } from '../lib/http.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getEffectivePolicy } from '../services/policy.js';
import { buildExportDocument, buildExportCsv } from '../services/export.js';
import {
  saveExportJob,
  getExportJob,
  updateExportJob,
  listExportJobs,
} from '../repositories/exports.js';
import { logActivity } from '../services/activity.js';
import { s3, BUCKET, presignDownload } from '../s3/client.js';
import { id, nowIso } from '../lib/util.js';

export const exportRouter = new Hono<AppEnv>();

/** エクスポート作成（同期処理） */
exportRouter.post('/admin/export', requireAuth, requireRole('office', 'admin'), async (c) => {
  const input = await parseBody(c, CreateExportSchema);
  const { policy } = await getEffectivePolicy(input.fiscalYear);
  if (input.format === 'json' && !policy.exportJsonEnabled)
    throw policyBlocked('JSONエクスポートは無効です');
  if (input.format === 'csv' && !policy.exportCsvEnabled)
    throw policyBlocked('CSVエクスポートは無効です');

  const now = nowIso();
  const jobId = id('export');
  let job: ExportJob = {
    exportJobId: jobId,
    fiscalYear: input.fiscalYear,
    exportType: input.exportType,
    format: input.format,
    requestedBy: c.get('user').userId,
    status: 'running',
    s3Key: null,
    recordCount: null,
    error: null,
    createdAt: now,
    completedAt: null,
  };
  await saveExportJob(job);

  try {
    let content: string;
    let recordCount: number;
    let contentType: string;
    if (input.format === 'json') {
      const doc = await buildExportDocument(input.fiscalYear);
      content = JSON.stringify(doc, null, 2);
      recordCount = doc.submissions.length;
      contentType = 'application/json';
    } else {
      content = await buildExportCsv(input.fiscalYear);
      recordCount = Math.max(0, content.split('\r\n').length - 1);
      contentType = 'text/csv';
    }

    const s3Key = `exports/fiscalYear=${input.fiscalYear}/${jobId}.${input.format}`;
    await s3.send(
      new PutObjectCommand({ Bucket: BUCKET, Key: s3Key, Body: content, ContentType: contentType }),
    );

    const completedAt = nowIso();
    await updateExportJob(jobId, { status: 'completed', s3Key, recordCount, completedAt });
    job = { ...job, status: 'completed', s3Key, recordCount, completedAt };
  } catch (e) {
    await updateExportJob(jobId, { status: 'failed', error: String(e) });
    job = { ...job, status: 'failed', error: String(e) };
  }

  await logActivity(c, {
    fiscalYear: input.fiscalYear,
    action: 'export.create',
    targetType: 'export',
    targetId: jobId,
    afterStatus: job.status,
  });
  return c.json(job);
});

/** ジョブ一覧 */
exportRouter.get('/admin/exports', requireAuth, requireRole('office', 'admin'), async (c) => {
  const fiscalYear = c.req.query('fiscalYear') ?? '';
  const items = await listExportJobs(fiscalYear);
  return c.json({ items });
});

/** ジョブ取得 */
exportRouter.get('/admin/export/:id', requireAuth, requireRole('office', 'admin'), async (c) => {
  const job = await getExportJob(c.req.param('id'));
  if (!job) throw notFound('エクスポートが見つかりません');
  return c.json(job);
});

/** ダウンロード用 presigned URL */
exportRouter.get(
  '/admin/export/:id/download',
  requireAuth,
  requireRole('office', 'admin'),
  async (c) => {
    const job = await getExportJob(c.req.param('id'));
    if (!job || !job.s3Key) throw notFound('ダウンロード可能なファイルがありません');
    const url = await presignDownload(job.s3Key, `export-${job.fiscalYear}.${job.format}`);
    return c.json({ url });
  },
);
