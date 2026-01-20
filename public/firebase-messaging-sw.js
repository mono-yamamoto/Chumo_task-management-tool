/* eslint-disable no-undef */
// Firebase Messaging Service Worker
// このファイルはバックグラウンドでプッシュ通知を受信するために必要です

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase設定（環境変数は使用できないので直接記述）
// 注意: これらの値は公開されても問題ない設定値です
const firebaseConfig = {
  apiKey: 'AIzaSyARYqolJwU94zOPg3Crg6dWnyacViWveJU',
  authDomain: 'chumo-3506a.firebaseapp.com',
  projectId: 'chumo-3506a',
  storageBucket: 'chumo-3506a.firebasestorage.app',
  messagingSenderId: '687214998081',
  appId: '1:687214998081:web:c4381c54904630b9d68cc0',
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// バックグラウンドメッセージハンドラ
messaging.onBackgroundMessage((payload) => {
  console.info('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'Chumo通知';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    tag: payload.data?.commentId || 'comment-notification',
    data: payload.data,
    // クリック時にタスク詳細ページに遷移できるようにデータを保持
    actions: [
      {
        action: 'open',
        title: '開く',
      },
    ],
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// 通知クリック時のハンドラ
self.addEventListener('notificationclick', (event) => {
  console.info('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data;
  let targetUrl = '/';

  // タスク詳細ページへのURLを構築
  if (data?.projectType && data?.taskId) {
    targetUrl = `/tasks/${data.taskId}`;
  }

  // ウィンドウにフォーカスまたは新しいタブを開く
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 既存のウィンドウがあればそれにフォーカス
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      // 既存のウィンドウがなければ新しいタブを開く
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
