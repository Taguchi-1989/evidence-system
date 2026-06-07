/** AWS Lambda エントリ（API Gateway HTTP API）。同じ Hono アプリをそのまま載せる。 */
import { handle } from 'hono/aws-lambda';
import { createApp } from './app.js';

export const handler = handle(createApp());
