import { useState, useEffect, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { useAuth } from './useAuth';

/**
 * Web Push 通知の購読管理
 * - ブラウザの通知権限状態を監視
 * - Service Worker 登録 + Push 購読の開始/停止
 * - バックエンドへの subscription 登録/削除
 */
export function usePushNotifications() {
  const { getToken } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // マウント時に権限状態 + 既存 subscription を確認
  useEffect(() => {
    if (!('Notification' in window)) {
      setIsSupported(false);
      return;
    }
    setPermission(Notification.permission);

    if ('serviceWorker' in navigator) {
      // getRegistration で登録有無を安全に確認（ready と違いハングしない）
      navigator.serviceWorker
        .getRegistration()
        .then((reg) => reg?.pushManager.getSubscription())
        .then((sub) => {
          if (sub) setIsSubscribed(true);
        })
        .catch(() => {});
    }
  }, []);

  const subscribe = useMutation({
    mutationFn: async () => {
      setError(null);

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        throw new Error('通知の許可が拒否されました');
      }

      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (vapidKey && 'serviceWorker' in navigator) {
        // フル Web Push 購読
        const reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: vapidKey,
        });

        await apiClient('/api/users/me/fcm-tokens', {
          method: 'POST',
          body: { token: sub.endpoint },
          getToken,
        });
      }
      // VAPID未設定: 通知許可のみ（バックエンドにはトークン保存しない）

      setIsSubscribed(true);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '通知の設定に失敗しました');
    },
  });

  const unsubscribe = useMutation({
    mutationFn: async () => {
      setError(null);

      if ('serviceWorker' in navigator) {
        // getRegistration で安全にチェック（未登録ならnull、ハングしない）
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await apiClient('/api/users/me/fcm-tokens', {
              method: 'DELETE',
              body: { token: sub.endpoint },
              getToken,
            });
            await sub.unsubscribe();
          }
        }
      }

      setIsSubscribed(false);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '通知の解除に失敗しました');
    },
  });

  const subscribeMutate = subscribe.mutate;
  const unsubscribeMutate = unsubscribe.mutate;
  const toggle = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        subscribeMutate();
      } else {
        unsubscribeMutate();
      }
    },
    [subscribeMutate, unsubscribeMutate]
  );

  return {
    isSupported,
    permission,
    isSubscribed,
    isPending: subscribe.isPending || unsubscribe.isPending,
    error,
    toggle,
  };
}
