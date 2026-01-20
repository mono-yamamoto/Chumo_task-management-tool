'use client';

import { getMessaging, getToken, onMessage, Messaging, MessagePayload } from 'firebase/messaging';
import { app } from './config';

let messaging: Messaging | null = null;

/**
 * Firebase Cloud Messagingを初期化
 */
export function initializeMessaging(): Messaging | null {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!app) {
    console.warn('Firebase app is not initialized');
    return null;
  }

  if (messaging) {
    return messaging;
  }

  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Failed to initialize Firebase Messaging:', error);
    return null;
  }
}

/**
 * FCMトークンを取得
 * @returns FCMトークン、または取得失敗時はnull
 */
export async function getFcmToken(): Promise<string | null> {
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  if (!vapidKey) {
    console.warn('VAPID key is not configured. Please set NEXT_PUBLIC_FIREBASE_VAPID_KEY');
    return null;
  }

  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    return null;
  }

  try {
    // Service Workerの登録を確認
    const registration = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (!registration) {
      console.warn('Service Worker is not registered');
      return null;
    }

    // Service Workerがアクティブになるまで待つ
    if (!registration.active) {
      await navigator.serviceWorker.ready;
    }

    const token = await getToken(messagingInstance, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (token) {
      return token;
    } else {
      console.warn('No FCM token available. Request permission to generate one.');
      return null;
    }
  } catch (error) {
    console.error('Failed to get FCM token:', error);
    return null;
  }
}

/**
 * 通知権限をリクエスト
 * @returns 許可されたらtrue
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission was denied');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return false;
  }
}

/**
 * フォアグラウンドメッセージのリスナーを設定
 * @param callback メッセージを受け取った時のコールバック
 * @returns リスナーの解除関数
 */
export function onForegroundMessage(
  callback: (payload: MessagePayload) => void
): (() => void) | null {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    return null;
  }

  return onMessage(messagingInstance, callback);
}

/**
 * 通知権限の現在の状態を取得
 */
export function getNotificationPermissionStatus(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}
