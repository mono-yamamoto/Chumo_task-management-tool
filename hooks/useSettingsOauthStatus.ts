'use client';

import { useEffect, useState } from 'react';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { User } from '@/types';

type OauthStatus = 'connected' | 'disconnected' | 'loading';

type UseSettingsOauthStatusOptions = {
  currentUser: User | null;
  fallbackUser: User | null;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
};

export function useSettingsOauthStatus({
  currentUser,
  fallbackUser,
  router,
  searchParams,
}: UseSettingsOauthStatusOptions) {
  const [githubUsername, setGithubUsername] = useState(fallbackUser?.githubUsername || '');
  const [chatId, setChatId] = useState(fallbackUser?.chatId || '');
  const [oauthStatus, setOauthStatus] = useState<OauthStatus>('loading');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      const hasToken = !!currentUser.googleRefreshToken;
      console.debug('OAuth status check:', {
        userId: currentUser.id,
        hasToken,
        tokenLength: currentUser.googleRefreshToken?.length || 0,
        allFields: Object.keys(currentUser),
      });
      // 次のレンダリングサイクルでsetStateを実行
      setTimeout(() => {
        setOauthStatus(hasToken ? 'connected' : 'disconnected');
        setGithubUsername(currentUser.githubUsername || '');
        setChatId(currentUser.chatId || '');
      }, 0);
    }
  }, [currentUser]);

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');

    // 次のレンダリングサイクルでsetStateを実行
    setTimeout(() => {
      if (success === 'oauth_connected') {
        setMessage('Google Drive認証が完了しました');
        setOauthStatus('connected');
        // URLからパラメータを削除
        router.replace('/settings');
      } else if (error) {
        setMessage(`エラー: ${errorMessage || error}`);
        // URLからパラメータを削除
        router.replace('/settings');
      }
    }, 0);
  }, [searchParams, router]);

  return {
    oauthStatus,
    setOauthStatus,
    githubUsername,
    setGithubUsername,
    chatId,
    setChatId,
    message,
    setMessage,
  };
}
