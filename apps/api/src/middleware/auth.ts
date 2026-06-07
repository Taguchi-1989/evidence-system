/** 認証ミドルウェアと RBAC ガード。 */
import type { MiddlewareHandler } from 'hono';
import { RoleEnum, type AuthUser, type Role } from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { config } from '../config.js';
import { getAuthProvider, extractBearer } from '../auth/index.js';
import { forbidden, unauthorized } from '../lib/http.js';

/** 外部Agent向け：Bearer が AGENT_API_KEYS に一致すればサービスIDで認証 */
function serviceUserForKey(token: string): AuthUser | null {
  if (!config.integration.agentApiKeys.includes(token)) return null;
  const role = RoleEnum.safeParse(config.integration.agentApiRole).success
    ? (config.integration.agentApiRole as Role)
    : 'office';
  return {
    userId: 'svc-agent',
    name: 'External Agent',
    role,
    departmentId: '-',
    managedDepartmentIds: [],
  };
}

/** トークンを検証して c.var.user をセット。未認証は 401。 */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = extractBearer(c.req.header('Authorization'));
  if (!token) throw unauthorized();

  // 外部Agentソフト連携：APIキー一致ならサービスIDで通す
  const svc = serviceUserForKey(token);
  if (svc) {
    c.set('user', svc);
    await next();
    return;
  }

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
