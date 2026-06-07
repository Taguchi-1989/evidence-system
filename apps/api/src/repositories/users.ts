/** ユーザープロフィール（モック認証 + RBAC スコープ）のリポジトリ。 */
import type { AuthUser } from '@evidence/shared';
import { getItem, putItem, query } from '../db/ops.js';
import { userKeys, userPk, USER_LIST_GSI1PK } from '../db/keys.js';

const TYPE = 'User';

export async function putUser(user: AuthUser): Promise<void> {
  await putItem(TYPE, userKeys(user.userId, user.role), user);
}

export async function getUser(userId: string): Promise<AuthUser | null> {
  return getItem<AuthUser>(userPk(userId), 'PROFILE');
}

/** ログイン画面の選択肢用：全ユーザー一覧 */
export async function listUsers(): Promise<AuthUser[]> {
  return query<AuthUser>(USER_LIST_GSI1PK, { index: 'gsi1' });
}
