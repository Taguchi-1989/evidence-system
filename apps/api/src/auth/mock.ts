/**
 * モック認証プロバイダ（開発専用）。
 * トークンは base64url(JSON({userId, role?}))。検証時に DB のユーザーを引き、
 * role 上書きがあればロールだけ差し替える（デモで各ロールの見え方を確認するため）。
 * 本番ではこのプロバイダは使わない（AUTH_PROVIDER=cognito）。
 */
import type { AuthUser, Role } from '@evidence/shared';
import { RoleEnum } from '@evidence/shared';
import type { AuthProvider } from './provider.js';
import { getUser } from '../repositories/users.js';

interface MockClaims {
  userId: string;
  role?: Role;
}

export function encodeMockToken(userId: string, role?: Role): string {
  const claims: MockClaims = { userId, ...(role ? { role } : {}) };
  return Buffer.from(JSON.stringify(claims), 'utf8').toString('base64url');
}

function decodeMockToken(token: string): MockClaims | null {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as MockClaims;
    if (!parsed.userId) return null;
    if (parsed.role && !RoleEnum.safeParse(parsed.role).success) return null;
    return parsed;
  } catch {
    return null;
  }
}

export class MockAuthProvider implements AuthProvider {
  async verify(token: string): Promise<AuthUser | null> {
    const claims = decodeMockToken(token);
    if (!claims) return null;
    const user = await getUser(claims.userId);
    if (!user) return null;
    // ロール上書き（デモ用）。上書き時は managedDepartmentIds はそのまま流用。
    return claims.role ? { ...user, role: claims.role } : user;
  }
}
