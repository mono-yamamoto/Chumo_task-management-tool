import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Navigate, Outlet } from 'react-router-dom';
import { Spinner } from '../ui/Spinner';

/**
 * 認証ガード: 未認証なら /login へリダイレクト
 * <Route element={<AuthGuard />}> で使う
 */
export function AuthGuard() {
  const { isLoaded, isSignedIn } = useClerkAuth();

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
