'use client';

import { useEffect } from 'react';
import { ActiveSession } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { fetchActiveSessionForTask } from '@/lib/api/sessionRepository';

/**
 * localStorageに永続化されたactiveSessionを検証するフック
 * ページロード時にAPIの実際のセッション状態と照合し、
 * 不一致の場合はactiveSessionをクリアする
 *
 * @param userId ユーザーID
 * @param activeSession 現在のactiveSession
 * @param setActiveSession activeSessionを更新する関数
 */
export function useActiveSessionValidator(
  userId: string | null | undefined,
  activeSession: ActiveSession | null,
  setActiveSession: (_session: ActiveSession | null) => void
) {
  const { getToken } = useAuth();

  useEffect(() => {
    // ユーザーIDまたはactiveSessionがない場合は検証不要
    if (!userId || !activeSession) {
      return;
    }

    // 'pending'状態のセッションは検証不要（タイマー起動直後の一時的な状態）
    if (activeSession.sessionId === 'pending') {
      return;
    }

    // APIの実際のセッション状態と照合
    const validateSession = async () => {
      try {
        const apiSession = await fetchActiveSessionForTask(
          {
            projectType: activeSession.projectType,
            taskId: activeSession.taskId,
            userId: userId,
          },
          getToken
        );

        // APIにセッションが存在しない、またはセッションIDが一致しない場合
        if (!apiSession || apiSession.sessionId !== activeSession.sessionId) {
          console.warn('localStorage内のactiveSessionがAPIと不一致のためクリアします', {
            localStorage: activeSession,
            api: apiSession,
          });
          setActiveSession(null);
        }
      } catch (error) {
        console.error('activeSessionの検証中にエラーが発生しました:', error);
        // エラーが発生した場合は、安全のためactiveSessionをクリア
        setActiveSession(null);
      }
    };

    validateSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // 初回マウント時のみ実行
}
