/**
 * Hono アプリ本体。ローカル(@hono/node-server)でも Lambda(hono/aws-lambda)でも
 * この同一インスタンスを使う。ルートはここで集約する。
 */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { AppEnv } from './types.js';
import { config } from './config.js';
import { onError } from './middleware/error.js';
import { authRouter } from './handlers/auth.js';
import { submissionsRouter } from './handlers/submissions.js';
import { evidenceRouter } from './handlers/evidence.js';
import { adminRouter } from './handlers/admin.js';
import { configRouter } from './handlers/config.js';
import { exportRouter } from './handlers/export.js';

export function createApp() {
  const app = new Hono<AppEnv>();

  app.use('*', cors({ origin: config.api.corsOrigin, credentials: true }));
  app.onError(onError);

  app.get('/health', (c) => c.json({ ok: true, service: 'evidence-api' }));

  app.route('/', authRouter);
  app.route('/', configRouter);
  app.route('/', submissionsRouter);
  app.route('/', evidenceRouter);
  app.route('/', adminRouter);
  app.route('/', exportRouter);

  return app;
}

export type AppType = ReturnType<typeof createApp>;
