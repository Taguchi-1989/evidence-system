/**
 * ローカルFSドライバ用のアップロード/ダウンロード経路（local モードのみ）。
 * presigned URL の代替。ブラウザは通常の PUT/GET でアクセスする。
 */
import { Hono } from 'hono';
import type { AppEnv } from '../types.js';
import { putObject, getObjectBuffer, verifyToken } from '../storage/local-driver.js';

export const localObjectsRouter = new Hono<AppEnv>();

/** アップロード（presignUpload が指す先） */
localObjectsRouter.put('/_local-objects/:enc', async (c) => {
  const key = decodeURIComponent(c.req.param('enc'));
  if (!verifyToken(c.req.query('token') ?? '', key, 'put')) {
    return c.json({ error: 'invalid or expired token' }, 403);
  }
  const buf = new Uint8Array(await c.req.arrayBuffer());
  await putObject(key, buf, c.req.header('content-type') ?? 'application/octet-stream');
  return c.json({ ok: true });
});

/** ダウンロード（presignDownload が指す先） */
localObjectsRouter.get('/_local-objects/:enc', (c) => {
  const key = decodeURIComponent(c.req.param('enc'));
  if (!verifyToken(c.req.query('token') ?? '', key, 'get')) {
    return c.json({ error: 'invalid or expired token' }, 403);
  }
  const buf = getObjectBuffer(key);
  if (!buf) return c.json({ error: 'not found' }, 404);
  const filename = c.req.query('filename');
  if (filename) {
    c.header('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
  }
  return c.body(new Uint8Array(buf));
});
