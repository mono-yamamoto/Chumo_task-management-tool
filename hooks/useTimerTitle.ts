'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession } from '@/hooks/useTaskSessions';
import { startLiveFavicon, stopLiveFavicon } from '@/utils/liveFavicon';

const DEFAULT_TITLE = 'ちゅも';

export function useTimerTitle() {
  const { user } = useAuth();
  const { data: activeSession } = useActiveSession(user?.id || null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitleRef = useRef<string>(DEFAULT_TITLE);

  useEffect(() => {
    // 元のタイトルを保存（初回のみ）
    if (originalTitleRef.current === DEFAULT_TITLE && typeof document !== 'undefined') {
      originalTitleRef.current = document.title || DEFAULT_TITLE;
    }

    if (!activeSession || !activeSession.startedAt) {
      // アクティブセッションがない場合、元のタイトルとfaviconに戻す
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
      stopLiveFavicon();
      return;
    }

    // タイマー更新関数
    const updateTitle = () => {
      if (typeof document === 'undefined') return;

      const now = new Date();
      const startTime =
        activeSession.startedAt instanceof Date
          ? activeSession.startedAt
          : new Date(activeSession.startedAt);

      const elapsedSeconds = Math.floor((now.getTime() - startTime.getTime()) / 1000);

      // 時間をHH:MM:SS形式にフォーマット
      const hours = Math.floor(elapsedSeconds / 3600);
      const minutes = Math.floor((elapsedSeconds % 3600) / 60);
      const seconds = elapsedSeconds % 60;

      const timeString =
        hours > 0
          ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
          : `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      document.title = `🔴 ${timeString} - ${originalTitleRef.current}`;
    };

    // ライブfaviconアニメーションを開始
    startLiveFavicon();

    // 即座に更新
    updateTitle();

    // 1秒ごとに更新
    intervalRef.current = setInterval(updateTitle, 1000);

    // クリーンアップ
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.title = originalTitleRef.current;
      }
      stopLiveFavicon();
    };
  }, [activeSession]);
}
