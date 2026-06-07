/** ローカル開発サーバ（@hono/node-server）。 */
import { serve } from '@hono/node-server';
import { config } from './config.js';
import { createApp } from './app.js';

const app = createApp();

serve({ fetch: app.fetch, port: config.api.port }, (info) => {
  console.log(`[evidence-api] listening on http://localhost:${info.port}`);
  console.log(`[evidence-api] auth=${config.auth.provider} table=${config.ddb.tableName}`);
});
