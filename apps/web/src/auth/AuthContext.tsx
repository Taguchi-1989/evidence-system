/**
 * 認証コンテキスト（モック）。トークンを localStorage に保持し、起動時に復元。
 * ロール切替（デモ用）は同一ユーザーで role を上書きして再ログインする。
 * 本番(Cognito)化時もこのコンテキストの公開 API は変えずに済む。
 */
import * as React from 'react';
import type { AuthUser, Role, LoginResponse } from '@evidence/shared';
import { apiFetch, getToken, setToken } from '@/lib/api';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (userId: string, role?: Role) => Promise<void>;
  switchRole: (role: Role) => Promise<void>;
  logout: () => void;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);

  // 起動時：トークンがあればセッション復元
  React.useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiFetch<AuthUser>('/auth/me')
      .then((u) => {
        setUser(u);
        setCurrentUserId(u.userId);
      })
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = React.useCallback(async (userId: string, role?: Role) => {
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: role ? { userId, role } : { userId },
      noAuth: true,
    });
    setToken(res.token);
    setUser(res.user);
    setCurrentUserId(userId);
  }, []);

  const switchRole = React.useCallback(
    async (role: Role) => {
      if (!currentUserId) return;
      await login(currentUserId, role);
    },
    [currentUserId, login],
  );

  const logout = React.useCallback(() => {
    setToken(null);
    setUser(null);
    setCurrentUserId(null);
  }, []);

  const value: AuthState = { user, loading, login, switchRole, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
