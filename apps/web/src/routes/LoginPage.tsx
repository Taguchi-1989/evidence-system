/** ログイン画面（モック）。seed済みユーザーを選んでログイン。導入メッセージ(§22)を表示。 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { AuthUser } from '@evidence/shared';
import { ROLE_LABELS } from '@evidence/shared';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/auth/AuthContext';
import { useToast } from '@/components/ui/toast';
import { messages } from '@/i18n/messages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [pending, setPending] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const { data: users, isLoading } = useQuery({
    queryKey: ['auth-users'],
    queryFn: () => apiFetch<AuthUser[]>('/auth/users', { noAuth: true }),
  });

  const handleLogin = async (userId: string) => {
    setPending(userId);
    try {
      await login(userId);
      navigate('/dashboard', { replace: true });
    } catch {
      notify(messages.toast.error, 'error');
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{messages.appName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{messages.appTagline}</p>
      </div>

      <Card>
        <CardContent className="whitespace-pre-line py-5 text-sm leading-relaxed text-muted-foreground">
          {messages.introMessage}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>利用者を選んでログイン（デモ）</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">読み込み中...</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {users?.map((u) => (
                <li key={u.userId}>
                  <Button
                    variant="outline"
                    className="h-auto w-full justify-between py-3"
                    disabled={pending !== null}
                    onClick={() => void handleLogin(u.userId)}
                  >
                    <span className="font-medium">{u.name}</span>
                    <span className="text-xs text-muted-foreground">{ROLE_LABELS[u.role]}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
