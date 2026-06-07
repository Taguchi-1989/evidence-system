import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { Loading } from '@/components/ui/loading';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <Loading className="h-screen" />;
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
