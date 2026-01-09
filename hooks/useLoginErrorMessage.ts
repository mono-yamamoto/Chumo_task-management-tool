'use client';

import { useEffect, useState } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';

// ログイン関連のエラーメッセージの定数定義
export const ERROR_MESSAGES = {
  NOT_ALLOWED: 'このアカウントは許可されていません。管理者に連絡してください。',
  LOGIN_FAILED: 'ログインに失敗しました。もう一度お試しください。',
} as const;

type UseLoginErrorMessageOptions = {
  searchParams: ReadonlyURLSearchParams;
};

export function useLoginErrorMessage({ searchParams }: UseLoginErrorMessageOptions) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'not_allowed') {
      // URLパラメータに基づく初期状態設定のためsetStateを使用
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError(ERROR_MESSAGES.NOT_ALLOWED);
    } else {
      // エラーパラメータが存在しない場合は状態をクリア

      setError(null);
    }
  }, [searchParams]);

  return { error, setError };
}
