/** 認証ルート（モック）。/auth/login, /auth/me, 開発用の /auth/users。 */
import { Hono } from 'hono';
import { MockLoginSchema, type LoginResponse } from '@evidence/shared';
import type { AppEnv } from '../types.js';
import { config } from '../config.js';
import { parseBody, unauthorized } from '../lib/http.js';
import { requireAuth } from '../middleware/auth.js';
import { encodeMockToken } from '../auth/index.js';
import { getUser, listUsers } from '../repositories/users.js';
import { saveActivity } from '../repositories/activity.js';
import { id, nowIso, currentFiscalYear } from '../lib/util.js';

export const authRouter = new Hono<AppEnv>();

/** モックログイン。seed 済みユーザーIDを指定（role 上書き可）。 */
authRouter.post('/auth/login', async (c) => {
  const input = await parseBody(c, MockLoginSchema);
  const user = await getUser(input.userId);
  if (!user) throw unauthorized('ユーザーが見つかりません');

  const effective = input.role ? { ...user, role: input.role } : user;
  const token = encodeMockToken(user.userId, input.role);

  await saveActivity({
    eventId: id('evt'),
    fiscalYear: currentFiscalYear(),
    actorUserId: effective.userId,
    actorRole: effective.role,
    action: 'login',
    targetType: 'user',
    targetId: effective.userId,
    beforeStatus: null,
    afterStatus: null,
    timestamp: nowIso(),
    ipAddress: c.req.header('x-forwarded-for') ?? null,
    userAgent: c.req.header('user-agent') ?? null,
  });

  const body: LoginResponse = { token, user: effective };
  return c.json(body);
});

/** 現在のユーザー */
authRouter.get('/auth/me', requireAuth, (c) => c.json(c.get('user')));

/** 開発用：ログイン画面の選択肢（mock のときのみ） */
authRouter.get('/auth/users', async (c) => {
  if (config.auth.provider !== 'mock') return c.json([]);
  const users = await listUsers();
  return c.json(users);
});
