import { SignIn } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import { Eye, ShieldX } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePreviewMode, PREVIEW_ENABLED } from '../../hooks/usePreviewMode';
import { Button } from '../../components/ui/Button';

export function LoginPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { loginAsPreview } = usePreviewMode();
  const accessDenied = sessionStorage.getItem('access-denied') === 'true';

  // 認証済みならダッシュボードへ（フラグもクリア）
  if (isLoaded && isSignedIn) {
    sessionStorage.removeItem('access-denied');
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-primary">
      <div className="flex flex-col items-center gap-8">
        {accessDenied && (
          <div className="flex max-w-[400px] flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-6 py-4 text-center dark:border-red-800 dark:bg-red-950">
            <ShieldX className="size-8 text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              アクセス権限がありません
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              このアカウントはアプリケーションへのアクセスが許可されていません。管理者にお問い合わせください。
            </p>
          </div>
        )}
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
        {PREVIEW_ENABLED && (
          <Button
            variant="outline"
            size="lg"
            onPress={loginAsPreview}
            className="w-full max-w-[400px] text-text-secondary"
          >
            <Eye size={16} />
            プレビューモードでログイン
          </Button>
        )}
      </div>
    </div>
  );
}
