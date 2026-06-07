/** 証跡（EvidenceFile）ルート — 要件 §14 presigned URL フロー。提出配下にネスト。 */
import { Hono } from 'hono';
import {
  PresignUploadSchema,
  ConfirmEvidenceSchema,
  type EvidenceFile,
  type PresignUploadResponse,
} from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { config } from '../config.js';
import { parseBody, notFound } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { getSubmission, saveSubmission } from '../repositories/submissions.js';
import {
  saveEvidence,
  getEvidence,
  listEvidence,
  updateEvidence,
} from '../repositories/evidence.js';
import { assertCanEdit, assertCanView } from '../services/rbac.js';
import { presignUpload, presignDownload, BUCKET_LABEL } from '../storage/objects.js';
import { evidenceS3Key } from '../s3/keys.js';
import { logActivity } from '../services/activity.js';
import { id, nowIso } from '../lib/util.js';

export const evidenceRouter = new Hono<AppEnv>();

async function loadEditable(c: { req: { param: (k: string) => string } }, user: AppEnv['Variables']['user']) {
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanEdit(user, s);
  return s;
}

/** 1) アップロードURL発行（§14.1 step1） */
evidenceRouter.post('/submissions/:id/evidence/presign', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await loadEditable(c, user);
  const input = await parseBody(c, PresignUploadSchema);

  const evidenceId = id('ev');
  const s3Key = evidenceS3Key({
    fiscalYear: s.fiscalYear,
    departmentId: s.departmentId,
    userId: s.userId,
    submissionId: s.submissionId,
    evidenceId,
    originalFileName: input.originalFileName,
  });
  const uploadUrl = await presignUpload(s3Key, input.contentType);

  const ev: EvidenceFile = {
    evidenceId,
    submissionId: s.submissionId,
    fiscalYear: s.fiscalYear,
    s3Bucket: BUCKET_LABEL,
    s3Key,
    originalFileName: input.originalFileName,
    contentType: input.contentType,
    fileSize: input.fileSize,
    checksum: null,
    evidenceType: input.evidenceType,
    relatedAxis: input.relatedAxis,
    description: input.description ?? '',
    uploadedBy: user.userId,
    uploadedAt: null,
    isConfidential: false,
    storageStatus: 'pending',
    deletedAt: null,
  };
  await saveEvidence(ev);
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'evidence.presign',
    targetType: 'evidence',
    targetId: evidenceId,
  });

  const body: PresignUploadResponse = {
    evidenceId,
    uploadUrl,
    s3Key,
    expiresIn: config.s3.presignExpires,
  };
  return c.json(body);
});

/** 2) アップロード完了の確定（§14.1 メタ確定）。提出側の証跡有無も更新。 */
evidenceRouter.post('/submissions/:id/evidence/confirm', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await loadEditable(c, user);
  const input = await parseBody(c, ConfirmEvidenceSchema);

  const ev = await getEvidence(s.submissionId, input.evidenceId);
  if (!ev || ev.deletedAt) throw notFound('証跡が見つかりません');

  const now = nowIso(); // DB とレスポンスで同一時刻を使う
  await updateEvidence(s.submissionId, ev.evidenceId, {
    storageStatus: 'uploaded',
    uploadedAt: now,
    checksum: input.checksum ?? null,
  });

  // 証跡ありに反映（§10.1）
  if (!s.hasEvidence || s.evidencePresence !== 'AVAILABLE') {
    s.evidencePresence = 'AVAILABLE';
    s.hasEvidence = true;
    s.updatedAt = now;
    await saveSubmission(s);
  }

  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'evidence.confirm',
    targetType: 'evidence',
    targetId: ev.evidenceId,
  });
  return c.json({ ...ev, storageStatus: 'uploaded', uploadedAt: now });
});

/** 証跡一覧 */
evidenceRouter.get('/submissions/:id/evidence', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanView(user, s);
  const items = await listEvidence(s.submissionId);
  return c.json({ items });
});

/** ダウンロード用 presigned URL */
evidenceRouter.get('/submissions/:id/evidence/:eid/download', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await getSubmission(c.req.param('id'));
  if (!s || s.deletedAt) throw notFound('提出が見つかりません');
  assertCanView(user, s);
  const ev = await getEvidence(s.submissionId, c.req.param('eid'));
  if (!ev || ev.deletedAt) throw notFound('証跡が見つかりません');
  const url = await presignDownload(ev.s3Key, ev.originalFileName);
  return c.json({ url, expiresIn: config.s3.presignExpires });
});

/** 論理削除 */
evidenceRouter.delete('/submissions/:id/evidence/:eid', requireAuth, async (c) => {
  const user = c.get('user');
  const s = await loadEditable(c, user);
  const ev = await getEvidence(s.submissionId, c.req.param('eid'));
  if (!ev || ev.deletedAt) throw notFound('証跡が見つかりません');
  await updateEvidence(s.submissionId, ev.evidenceId, {
    deletedAt: nowIso(),
    storageStatus: 'deleted',
  });
  await logActivity(c, {
    fiscalYear: s.fiscalYear,
    action: 'evidence.delete',
    targetType: 'evidence',
    targetId: ev.evidenceId,
  });
  return c.json({ ok: true });
});
