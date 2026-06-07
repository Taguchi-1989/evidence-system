/**
 * Cognito 認証プロバイダ（本番用の雛形）。
 * 本格運用時に JWT(JWKS) 検証を実装する。MVP では未使用。
 * ここを実装するだけで、ハンドラ側は無改変で本番認証に移行できる。
 */
import type { AuthUser } from '@evidence/shared';
import type { AuthProvider } from './provider.js';

export class CognitoAuthProvider implements AuthProvider {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async verify(_token: string): Promise<AuthUser | null> {
    // TODO(M9+): JWKS で署名検証 → claims を AuthUser に正規化。
    // 部署/ロールは Cognito group / カスタム属性、または DB のプロフィールから解決。
    throw new Error('CognitoAuthProvider は未実装です（AUTH_PROVIDER=mock を使用してください）');
  }
}
