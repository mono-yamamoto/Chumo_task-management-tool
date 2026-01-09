'use client';

import { useState } from 'react';
import { QueryClient, QueryKey } from '@tanstack/react-query';
import { useActiveSession } from '@/hooks/useTaskSessions';
import { useTimerActions } from '@/hooks/useTimerActions';
import {
  useDriveIntegration,
  useFireIntegration,
  useGoogleChatIntegration,
} from '@/hooks/useIntegrations';
import { buildTaskDetailUrl } from '@/utils/taskLinks';
import { formatDuration as formatDurationUtil } from '@/utils/timer';
import { ActiveSession, ProjectType } from '@/types';

type TaskDetailActionsOptions = {
  userId?: string | null;
  queryClient: QueryClient;
  listQueryKeys: QueryKey[];
  refetchListQueryKeys?: QueryKey[];
  detailQueryKey: (_taskId: string) => QueryKey;
  refetchListOnChat?: boolean;
  refetchDetailOnChat?: boolean;
  refetchDetailOnDrive?: boolean;
  activeSession?: ActiveSession | null;
  setActiveSession?: (_session: ActiveSession | null) => void;
};

export function useTaskDetailActions({
  userId,
  queryClient,
  listQueryKeys,
  refetchListQueryKeys,
  detailQueryKey,
  refetchListOnChat = true,
  refetchDetailOnChat = true,
  refetchDetailOnDrive = true,
  activeSession,
  setActiveSession,
}: TaskDetailActionsOptions) {
  const [internalActiveSession, setInternalActiveSession] = useState<ActiveSession | null>(null);
  const resolvedActiveSession = activeSession !== undefined ? activeSession : internalActiveSession;
  const setActiveSessionValue = setActiveSession ?? setInternalActiveSession;
  const { stopTimer, startTimerWithOptimistic, stopActiveSession } = useTimerActions({
    userId: userId ?? undefined,
    queryClient,
    setActiveSession: setActiveSessionValue,
  });
  const { createDriveFolder } = useDriveIntegration();
  const { createFireIssue } = useFireIntegration();
  const { createGoogleChatThread } = useGoogleChatIntegration();

  useActiveSession(userId ?? null, setActiveSessionValue);

  const notify = (message: string) => {
    if (typeof window !== 'undefined') {
      window.alert(message);
    }
  };

  const listRefetchKeys = refetchListQueryKeys ?? listQueryKeys;

  const invalidateListQueries = () => {
    listQueryKeys.forEach((queryKey) => {
      queryClient.invalidateQueries({ queryKey });
    });
  };

  const refetchListQueries = () => {
    listRefetchKeys.forEach((queryKey) => {
      queryClient.refetchQueries({ queryKey });
    });
  };

  const invalidateDetailQuery = (taskId: string) => {
    const queryKey = detailQueryKey(taskId);
    queryClient.invalidateQueries({ queryKey });
  };

  const refetchDetailQuery = (taskId: string) => {
    const queryKey = detailQueryKey(taskId);
    queryClient.refetchQueries({ queryKey });
  };

  const handleStartTimer = async (projectType: ProjectType, taskId: string) => {
    await startTimerWithOptimistic(projectType, taskId);
  };

  const handleStopTimer = async () => {
    await stopActiveSession(resolvedActiveSession);
  };

  const handleDriveCreate = async (projectType: ProjectType, taskId: string) => {
    try {
      const result = await createDriveFolder.mutateAsync({ projectType, taskId });
      invalidateListQueries();
      refetchListQueries();
      invalidateDetailQuery(taskId);
      if (refetchDetailOnDrive) {
        refetchDetailQuery(taskId);
      }

      if (result.warning) {
        notify(
          `Driveフォルダを作成しましたが、チェックシートの作成に失敗しました。\n\nフォルダURL: ${
            result.url || '取得できませんでした'
          }\n\nエラー: ${result.error || '不明なエラー'}`
        );
      }
    } catch (error: unknown) {
      console.error('Drive create error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      notify(`Driveフォルダの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleFireCreate = async (projectType: ProjectType, taskId: string) => {
    try {
      await createFireIssue.mutateAsync({ projectType: projectType, taskId });
      invalidateListQueries();
      refetchListQueries();
    } catch (error: unknown) {
      console.error('Fire create error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      notify(`GitHub Issueの作成に失敗しました: ${errorMessage}`);
    }
  };

  const handleChatThreadCreate = async (projectType: ProjectType, taskId: string) => {
    try {
      const taskUrl = buildTaskDetailUrl(taskId);
      if (!taskUrl) {
        notify('タスクのURLを生成できませんでした。');
        return;
      }

      await createGoogleChatThread.mutateAsync({ projectType: projectType, taskId, taskUrl });
      invalidateListQueries();
      if (refetchListOnChat) {
        refetchListQueries();
      }
      invalidateDetailQuery(taskId);
      if (refetchDetailOnChat) {
        refetchDetailQuery(taskId);
      }
    } catch (error: unknown) {
      console.error('Chat thread create error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      notify(`Google Chatスレッドの作成に失敗しました: ${errorMessage}`);
    }
  };

  const formatDuration = (
    seconds: number | undefined | null,
    startedAt?: Date,
    endedAt?: Date | null
  ) => {
    let secs = 0;
    if (seconds === undefined || seconds === null || Number.isNaN(seconds) || seconds === 0) {
      if (endedAt && startedAt) {
        secs = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
      } else {
        return '0秒';
      }
    } else {
      secs = Math.floor(Number(seconds));
    }
    return formatDurationUtil(secs);
  };

  return {
    activeSession: resolvedActiveSession,
    handleStartTimer,
    handleStopTimer,
    isStoppingTimer: stopTimer.isPending,
    handleDriveCreate,
    isCreatingDrive: createDriveFolder.isPending,
    handleFireCreate,
    isCreatingFire: createFireIssue.isPending,
    handleChatThreadCreate,
    isCreatingChatThread: createGoogleChatThread.isPending,
    formatDuration,
  };
}
