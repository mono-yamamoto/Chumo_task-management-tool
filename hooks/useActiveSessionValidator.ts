'use client';

import { useEffect } from 'react';
import { ActiveSession } from '@/types';
import { fetchActiveSessionForTask } from '@/lib/firestore/repositories/sessionRepository';

/**
 * localStorageに永続化されたactiveSessionを検証するフック
 * ページロード時にFirestoreの実際のセッション状態と照合し、
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
  useEffect(() => {
    // ユーザーIDまたはactiveSessionがない場合は検証不要
    if (!userId || !activeSession) {
      return;
    }

    // 'pending'状態のセッションは検証不要（タイマー起動直後の一時的な状態）
    if (activeSession.sessionId === 'pending') {
      return;
    }

    // Firestoreの実際のセッション状態と照合
    const validateSession = async () => {
      try {
        const firestoreSession = await fetchActiveSessionForTask({
          projectType: activeSession.projectType,
          taskId: activeSession.taskId,
          userId: userId,
        });

        // Firestoreにセッションが存在しない、またはセッションIDが一致しない場合
        if (!firestoreSession || firestoreSession.sessionId !== activeSession.sessionId) {
          console.warn(
            'localStorage内のactiveSessionがFirestoreと不一致のためクリアします',
            {
              localStorage: activeSession,
              firestore: firestoreSession,
            }
          );
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
