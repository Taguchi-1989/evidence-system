/**
 * ロール別ルートガード（要件 §13.2）。メニューに無い画面へ URL 直打ちした際に、
 * 壊れた画面 + 汎用エラーではなく「権限がありません」を明示する。
 * データ自体は API 側 RBAC でも保護されるが、ここで導線を分かりやすくする。
 */
import { Navigate, Outlet, Link } from 'react-router-dom';
import type { Role } from '@evidence/shared';
import { useAuth } from '@/auth/AuthContext';
import { messages } from '@/i18n/messages';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return (
      <Card className="mx-auto mt-10 max-w-md">
        <CardContent className="space-y-3 py-8 text-center">
          <p className="text-base font-semibold">{messages.common.noAccessTitle}</p>
          <p className="text-sm text-muted-foreground">{messages.common.noAccessBody}</p>
          <Link to="/dashboard">
            <Button variant="outline" size="sm">
              {messages.common.backToDashboard}
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }
  return <Outlet />;
}
