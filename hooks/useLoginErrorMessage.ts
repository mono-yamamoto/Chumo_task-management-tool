'use client';

import { useEffect, useState } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';

type UseLoginErrorMessageOptions = {
  searchParams: ReadonlyURLSearchParams;
};

export function useLoginErrorMessage({ searchParams }: UseLoginErrorMessageOptions) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'not_allowed') {
      // 次のレンダリングサイクルでsetStateを実行
      setTimeout(() => {
        setError('このアカウントは許可されていません。管理者に連絡してください。');
      }, 0);
    }
  }, [searchParams]);

  return { error, setError };
}
