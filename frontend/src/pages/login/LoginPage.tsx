import { SignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();

  // 認証済みならダッシュボードへ
  if (isLoaded && isSignedIn) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary">
      <div className="flex flex-col items-center gap-8">
        <h1 className="text-3xl font-bold text-text-primary">タスク管理ツール</h1>
        <SignIn
          routing="hash"
          fallbackRedirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: 'w-full max-w-[400px]',
            },
          }}
        />
      </div>
    </div>
  );
}
