/**
 * 軽量レート制限（固定ウィンドウ・インメモリ）。
 * 監査実行のように高コスト（LLM）な操作の連打を抑止する。
 *
 * 注: プロセス内カウンタのため Lambda 等の多インスタンス環境では厳密でない。
 * 本番では API Gateway スロットリング or 共有ストア（Redis/DynamoDB）を併用すること。
 */
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../types.js';
import { tooManyRequests } from '../lib/http.js';

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

export function rateLimit(opts: {
  max: number;
  windowMs: number;
  keyFn: (c: Parameters<MiddlewareHandler<AppEnv>>[0]) => string;
}): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const key = opts.keyFn(c);
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
      await next();
      return;
    }
    if (b.count >= opts.max) {
      const retry = Math.ceil((b.resetAt - now) / 1000);
      c.header('Retry-After', String(retry));
      throw tooManyRequests(`リクエストが多すぎます。${retry} 秒後に再試行してください。`);
    }
    b.count++;
    await next();
  };
}
