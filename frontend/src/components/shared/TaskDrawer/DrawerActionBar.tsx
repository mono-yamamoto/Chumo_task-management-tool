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
import { Button } from '../../ui/Button';
import { useActiveSession, useTimer, useElapsedTime } from '../../../hooks/useTimer';
import { useIntegrations, type IntegrationResult } from '../../../hooks/useIntegrations';
import { HttpError } from '../../../lib/api';
import type { Task } from '../../../types';

type IntegrationMutation = UseMutationResult<IntegrationResult, Error, string, unknown>;

interface DrawerActionBarProps {
  task: Task;
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
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
      mutation: IntegrationMutation,
      opts?: { onAuthError?: () => void }
    ) =>
      () => {
        if (existingUrl) {
          openExternal(existingUrl);
          return;
        }
        // ポップアップブロッカー対策: クリック時に同期的に空ウィンドウを開く
        const newWindow = window.open('', '_blank', 'noopener,noreferrer');
        mutation.mutate(task.id, {
          onSuccess: (data) => {
            if (data.url && newWindow && !newWindow.closed) {
              newWindow.location.href = data.url;
            } else if (data.url) {
              openExternal(data.url);
            }
          },
          onError: (error) => {
            newWindow?.close();
            if (opts?.onAuthError && error instanceof HttpError && error.details?.requiresAuth) {
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
      <Button
        variant="outline"
        size="lg"
        onPress={() => navigate(`/tasks/${task.id}`)}
        className="w-full border-primary-default text-primary-default hover:bg-bg-brand-subtle"
      >
        詳細ページ
      </Button>

      {/* タイマーボタン */}
      {isThisTaskActive ? (
        <Button
          variant="ghost"
          size="lg"
          onPress={handleTimerToggle}
          isDisabled={stop.isPending}
          className="w-full bg-error-bg text-error-text hover:bg-red-200 hover:text-error-text"
        >
          <Square size={16} fill="currentColor" />
          停止 {formatted}
        </Button>
      ) : (
        <Button
          variant="outline"
          size="lg"
          onPress={handleTimerToggle}
          isDisabled={start.isPending || isOtherTaskActive}
          className="w-full border-primary-default text-primary-default hover:bg-bg-brand-subtle"
          aria-label={isOtherTaskActive ? '他のタイマーが稼働中です' : 'タイマー開始'}
        >
          <Play size={18} />
          {isOtherTaskActive ? '他タイマー稼働中' : 'タイマー開始'}
        </Button>
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
      <Button
        variant="primary"
        size="lg"
        onPress={() => task.backlogUrl && openExternal(task.backlogUrl)}
        isDisabled={!task.backlogUrl}
        className="w-full"
      >
        <ExternalLink size={16} />
        BACKLOGを開く
      </Button>
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
    <Button
      variant="outline"
      size="lg"
      onPress={onClick}
      isDisabled={loading}
      className="text-xs text-text-secondary"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}
