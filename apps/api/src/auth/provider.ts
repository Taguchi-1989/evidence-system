/**
 * 認証プロバイダの抽象（プラン「移植性の原則」）。
 * 開発は MockAuthProvider、本番は CognitoAuthProvider に差し替えるだけ。
 * ハンドラ/ミドルウェアはこのインターフェースにのみ依存する。
 */
import type { AuthUser } from '@evidence/shared';

export interface AuthProvider {
  /** Authorization ヘッダのトークンを検証し、AuthUser に正規化する。失敗時 null。 */
  verify(token: string): Promise<AuthUser | null>;
}

/** "Bearer xxx" / "xxx" の双方から生トークンを取り出す */
export function extractBearer(header: string | undefined | null): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(.+)$/i.exec(header.trim());
  return m ? (m[1] ?? null) : header.trim();
}
