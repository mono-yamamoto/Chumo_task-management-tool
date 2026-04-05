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
import { Button } from '../../../components/ui/Button';
import { useActiveSession, useTimer, useElapsedTime } from '../../../hooks/useTimer';
import { useIntegrations, type IntegrationResult } from '../../../hooks/useIntegrations';
import { HttpError } from '../../../lib/api';
import type { Task } from '../../../types';

type IntegrationMutation = UseMutationResult<IntegrationResult, Error, string, unknown>;

interface TaskDetailActionBarProps {
  task: Task;
}

function openExternal(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function TaskDetailActionBar({ task }: TaskDetailActionBarProps) {
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
    <div className="flex items-center gap-2 py-2">
      {/* タイマー */}
      {isThisTaskActive ? (
        <Button
          variant="ghost"
          onPress={handleTimerToggle}
          isDisabled={stop.isPending}
          className="bg-error-bg text-error-text hover:bg-red-200 hover:text-error-text"
        >
          <Square size={16} fill="currentColor" />
          停止 {formatted}
        </Button>
      ) : (
        <Button
          variant="primary"
          onPress={handleTimerToggle}
          isDisabled={start.isPending || isOtherTaskActive}
        >
          <Play size={16} />
          {isOtherTaskActive ? '他タイマー稼働中' : 'タイマー開始'}
        </Button>
      )}

      {/* 外部サービス連携ボタン群 */}
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

      {/* BACKLOG */}
      <Button
        variant="outline"
        size="sm"
        onPress={() => task.backlogUrl && openExternal(task.backlogUrl)}
        isDisabled={!task.backlogUrl}
        className="border-teal-200 bg-bg-brand-subtle text-xs text-primary-default hover:bg-teal-100"
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
      onPress={onClick}
      isDisabled={loading}
      className="text-xs text-text-secondary"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}
