const PREVIEW_KEY = 'preview-mode';
export const PREVIEW_TOKEN_KEY = 'preview-token';

/** プレビュー機能が有効か（ビルド時に決定） */
export const PREVIEW_ENABLED = import.meta.env.VITE_PREVIEW_ENABLED === 'true';

/**
 * プレビューモード管理フック
 * localStorage でログイン状態を保持し、Clerk認証をバイパスする
 */
export function usePreviewMode() {
  const isPreview = localStorage.getItem(PREVIEW_KEY) === 'true';

  const loginAsPreview = () => {
    localStorage.setItem(PREVIEW_KEY, 'true');
    localStorage.setItem(PREVIEW_TOKEN_KEY, import.meta.env.VITE_PREVIEW_TOKEN ?? '');
    window.location.href = '/dashboard';
  };

  const logoutPreview = () => {
    localStorage.removeItem(PREVIEW_KEY);
    localStorage.removeItem(PREVIEW_TOKEN_KEY);
    window.location.href = '/login';
  };

  return { isPreview, loginAsPreview, logoutPreview };
}
