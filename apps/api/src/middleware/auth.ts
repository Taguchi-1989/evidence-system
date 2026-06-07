/** 認証ミドルウェアと RBAC ガード。 */
import type { MiddlewareHandler } from 'hono';
import type { Role } from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { getAuthProvider, extractBearer } from '../auth/index.js';
import { forbidden, unauthorized } from '../lib/http.js';

/** トークンを検証して c.var.user をセット。未認証は 401。 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = extractBearer(c.req.header('Authorization'));
  if (!token) throw unauthorized();
  const user = await getAuthProvider().verify(token);
  if (!user) throw unauthorized('トークンが無効です');
  c.set('user', user);
  await next();
};

/** 指定ロールのいずれかを要求するガード（requireAuth の後段で使う）。 */
export function requireRole(...roles: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const user = c.get('user');
    if (!roles.includes(user.role)) throw forbidden();
    await next();
  };
}
