import { useEffect } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { Spinner } from '../ui/Spinner';
import { Button } from '../ui/Button';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import { HttpError } from '../../lib/api';

/**
 * 未許可ユーザーを強制サインアウトして /login へリダイレクト
 */
function ForceSignOut() {
  const { signOut } = useClerkAuth();
  const navigate = useNavigate();

  useEffect(() => {
    sessionStorage.setItem('access-denied', 'true');
    signOut().then(() => {
      navigate('/login', { replace: true });
    });
  }, [signOut, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

/**
 * 認証ガード: 未認証なら /login へ、未登録/無効ユーザーなら強制サインアウト
 * <Route element={<AuthGuard />}> で使う
 */
export function AuthGuard() {
  const { isLoaded, isSignedIn } = useClerkAuth();
  const { data: currentUser, isLoading, error, refetch } = useCurrentUser();

  // Clerk ローディング中 or API ローディング中
  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // 未ログイン
  if (!isSignedIn) {
    return <Navigate to="/login" replace />;
  }

  // API エラー: 404（未登録）or 403（無効）→ 強制サインアウト
  if (error instanceof HttpError && (error.status === 404 || error.status === 403)) {
    return <ForceSignOut />;
  }

  // その他のエラー（ネットワーク等）→ リトライ可能なエラー表示
  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-text-secondary">データの取得に失敗しました</p>
        <Button variant="outline" onPress={() => refetch()}>
          再試行
        </Button>
      </div>
    );
  }

  // ユーザー存在するが isAllowed=false → 強制サインアウト
  if (!currentUser?.isAllowed) {
    return <ForceSignOut />;
  }

  return <Outlet />;
}
