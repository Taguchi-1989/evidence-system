/** Hono のコンテキスト型拡張（認証済みユーザーを c.var.user で参照）。 */
import type { AuthUser } from '@evidence/shared';

export interface AppEnv {
  Variables: {
    user: AuthUser;
    requestId: string;
  };
}
