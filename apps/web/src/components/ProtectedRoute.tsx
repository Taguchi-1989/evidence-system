import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex h-screen items-center justify-center text-muted-foreground">読み込み中...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
