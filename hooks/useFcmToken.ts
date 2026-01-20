'use client';

import { useEffect, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
  getFcmToken,
  requestNotificationPermission,
  getNotificationPermissionStatus,
  onForegroundMessage,
} from '@/lib/firebase/messaging';
import { useAuth } from './useAuth';

type NotificationPermissionStatus = globalThis.NotificationPermission | 'unsupported';

/**
 * FCMトークンを管理するカスタムフック
 */
export function useFcmToken() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermissionStatus>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // 権限状態を更新
  useEffect(() => {
    setPermissionStatus(getNotificationPermissionStatus());
  }, []);

  // トークンをFirestoreに保存
  const saveTokenMutation = useMutation({
    mutationFn: async ({ userId, fcmToken }: { userId: string; fcmToken: string }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(fcmToken),
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // トークンをFirestoreから削除
  const removeTokenMutation = useMutation({
    mutationFn: async ({ userId, fcmToken }: { userId: string; fcmToken: string }) => {
      if (!db) throw new Error('Firestore is not initialized');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(fcmToken),
        updatedAt: new Date(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });

  // 通知を有効化
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError(new Error('User is not authenticated'));
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // 権限をリクエスト
      const granted = await requestNotificationPermission();
      setPermissionStatus(getNotificationPermissionStatus());

      if (!granted) {
        setError(new Error('Notification permission denied'));
        return false;
      }

      // Service Workerを登録してアクティブになるまで待つ
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

          // Service Workerがアクティブになるまで待つ
          if (registration.installing) {
            await new Promise<void>((resolve) => {
              registration.installing!.addEventListener('statechange', function handler() {
                if (this.state === 'activated') {
                  this.removeEventListener('statechange', handler);
                  resolve();
                }
              });
            });
          } else if (registration.waiting) {
            await new Promise<void>((resolve) => {
              registration.waiting!.addEventListener('statechange', function handler() {
                if (this.state === 'activated') {
                  this.removeEventListener('statechange', handler);
                  resolve();
                }
              });
            });
          }
          // registration.active が既にある場合はそのまま進む
        } catch (swError) {
          console.error('Service Worker registration failed:', swError);
          setError(new Error('Failed to register Service Worker'));
          return false;
        }
      }

      // トークンを取得
      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        setError(new Error('Failed to get FCM token'));
        return false;
      }

      setToken(fcmToken);

      // Firestoreに保存
      await saveTokenMutation.mutateAsync({ userId: user.id, fcmToken });

      return true;
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, saveTokenMutation]);

  // 通知を無効化
  const disableNotifications = useCallback(async (): Promise<boolean> => {
    if (!user?.id || !token) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      await removeTokenMutation.mutateAsync({ userId: user.id, fcmToken: token });
      setToken(null);
      return true;
    } catch (err) {
      console.error('Failed to disable notifications:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, token, removeTokenMutation]);

  // フォアグラウンドメッセージのリスナーを設定
  useEffect(() => {
    if (!token) return;

    const unsubscribe = onForegroundMessage((payload) => {
      // ブラウザ通知を表示（フォアグラウンドでも表示したい場合）
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (window.Notification.permission === 'granted' && payload.notification) {
          new window.Notification(payload.notification.title || 'Chumo通知', {
            body: payload.notification.body,
            icon: '/icon-192x192.png',
          });
        }
      }
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [token]);

  return {
    token,
    permissionStatus,
    isLoading,
    error,
    isEnabled: !!token,
    enableNotifications,
    disableNotifications,
    isSaving: saveTokenMutation.isPending,
    isRemoving: removeTokenMutation.isPending,
  };
}
