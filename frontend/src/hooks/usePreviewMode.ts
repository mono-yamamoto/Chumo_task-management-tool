const PREVIEW_KEY = 'preview-mode';
export const PREVIEW_TOKEN_KEY = 'preview-token';

/** プレビュー機能が有効か（ビルド時に決定） */
export const PREVIEW_ENABLED = import.meta.env.VITE_PREVIEW_ENABLED === 'true';

/**
 * プレビューモード管理フック
 * localStorage でログイン状態を保持し、Clerk認証をバイパスする
 */
export function usePreviewMode() {
  const storedToken = localStorage.getItem(PREVIEW_TOKEN_KEY);
  const isPreview =
    PREVIEW_ENABLED &&
    localStorage.getItem(PREVIEW_KEY) === 'true' &&
    typeof storedToken === 'string' &&
    storedToken.trim().length > 0;

  const loginAsPreview = () => {
    const token = import.meta.env.VITE_PREVIEW_TOKEN;
    if (!PREVIEW_ENABLED || !token?.trim()) return;
    localStorage.setItem(PREVIEW_KEY, 'true');
    localStorage.setItem(PREVIEW_TOKEN_KEY, token.trim());
    window.location.href = '/dashboard';
  };

  const logoutPreview = () => {
    localStorage.removeItem(PREVIEW_KEY);
    localStorage.removeItem(PREVIEW_TOKEN_KEY);
    window.location.href = '/login';
  };

  return { isPreview, loginAsPreview, logoutPreview };
}
