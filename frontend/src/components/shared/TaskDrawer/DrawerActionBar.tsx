import { type ReactNode, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play,
  Square,
  ExternalLink,
  Folder,
  MessageCircle,
  Flame,
  PawPrint,
  Loader2,
} from 'lucide-react';
import type { UseMutationResult } from '@tanstack/react-query';
import { useActiveSession, useTimer, useElapsedTime } from '../../../hooks/useTimer';
import { useIntegrations } from '../../../hooks/useIntegrations';
import type { Task } from '../../../types';

interface DrawerActionBarProps {
  task: Task;
}

export function DrawerActionBar({ task }: DrawerActionBarProps) {
  const navigate = useNavigate();
  const { data: activeSession } = useActiveSession();
  const { start, stop } = useTimer();
  const { createDriveFolder, createChatThread, createFireIssue, createPetIssue } =
    useIntegrations();

  const isThisTaskActive = activeSession != null && activeSession.taskId === task.id;
  const isOtherTaskActive = activeSession != null && !isThisTaskActive;
  const { formatted } = useElapsedTime(
    isThisTaskActive && activeSession ? activeSession.startedAt : null
  );

  const handleTimerToggle = () => {
    if (isThisTaskActive && activeSession) {
      stop.mutate({
        sessionId: activeSession.id,
        projectType: activeSession.projectType ?? task.projectType,
      });
    } else {
      start.mutate({ taskId: task.id, projectType: task.projectType });
    }
  };

  // 統合ボタン共通ハンドラ生成
  const makeIntegrationHandler = useCallback(
    (
      existingUrl: string | null | undefined,
      mutation: UseMutationResult<any, any, string, any>,
      opts?: { onAuthError?: () => void }
    ) =>
      () => {
        if (existingUrl) {
          window.open(existingUrl, '_blank');
          return;
        }
        mutation.mutate(task.id, {
          onSuccess: (data: { url?: string; alreadyExists?: boolean }) => {
            if (data.url && !data.alreadyExists) {
              window.open(data.url, '_blank');
            }
          },
          onError: (error: Error) => {
            if (
              opts?.onAuthError &&
              (error.message?.includes('requiresAuth') || error.message?.includes('認証が必要'))
            ) {
              opts.onAuthError();
            }
          },
        });
      },
    [task.id]
  );

  const handleDriveClick = makeIntegrationHandler(task.googleDriveUrl, createDriveFolder, {
    onAuthError: () => navigate('/settings?tab=integrations'),
  });
  const handleChatClick = makeIntegrationHandler(task.googleChatThreadUrl, createChatThread);
  const handleFireClick = makeIntegrationHandler(task.fireIssueUrl, createFireIssue);
  const handlePetClick = makeIntegrationHandler(task.petIssueUrl, createPetIssue);

  return (
    <div className="border-b border-border-default px-6 py-4 space-y-3">
      {/* 詳細ページボタン */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary-default text-sm font-medium text-primary-default transition-colors hover:bg-bg-brand-subtle"
      >
        詳細ページ
      </button>

      {/* タイマーボタン */}
      {isThisTaskActive ? (
        <button
          type="button"
          onClick={handleTimerToggle}
          disabled={stop.isPending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-error-bg text-sm font-medium text-error-text transition-colors hover:bg-red-200 disabled:opacity-40"
        >
          <Square size={16} fill="currentColor" />
          停止 {formatted}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleTimerToggle}
          disabled={start.isPending || isOtherTaskActive}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary-default text-sm font-medium text-primary-default transition-colors hover:bg-bg-brand-subtle disabled:opacity-40"
          title={isOtherTaskActive ? '他のタイマーが稼働中です' : undefined}
        >
          <Play size={18} />
          {isOtherTaskActive ? '他タイマー稼働中' : 'タイマー開始'}
        </button>
      )}

      {/* 外部リンクボタングリッド */}
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <LinkButton
            icon={<Folder size={16} />}
            label={task.googleDriveUrl ? 'DRIVE開く' : 'DRIVE作成'}
            onClick={handleDriveClick}
            loading={createDriveFolder.isPending}
          />
          <LinkButton
            icon={<MessageCircle size={16} />}
            label={task.googleChatThreadUrl ? 'CHAT開く' : 'CHAT作成'}
            onClick={handleChatClick}
            loading={createChatThread.isPending}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LinkButton
            icon={<Flame size={16} />}
            label={task.fireIssueUrl ? 'FIRE開く' : 'FIRE issue作成'}
            onClick={handleFireClick}
            loading={createFireIssue.isPending}
          />
          <LinkButton
            icon={<PawPrint size={16} />}
            label={task.petIssueUrl ? 'PET開く' : 'PET issue作成'}
            onClick={handlePetClick}
            loading={createPetIssue.isPending}
          />
        </div>
      </div>

      {/* BACKLOGボタン */}
      <button
        type="button"
        onClick={() => task.backlogUrl && window.open(task.backlogUrl, '_blank')}
        disabled={!task.backlogUrl}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-default text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-40"
      >
        <ExternalLink size={16} />
        BACKLOGを開く
      </button>
    </div>
  );
}

function LinkButton({
  icon,
  label,
  onClick,
  loading,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-default text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary disabled:opacity-40"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </button>
  );
}
