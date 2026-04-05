import { Play, Square, ExternalLink, Folder, MessageCircle, Flame, PawPrint } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { IntegrationLinkButton } from '../../../components/ui/IntegrationLinkButton';
import { useActiveSession, useTimer, useElapsedTime } from '../../../hooks/useTimer';
import { useIntegrationActions } from '../../../hooks/useIntegrationActions';
import { openExternal } from '../../../lib/utils';
import type { Task } from '../../../types';

interface TaskDetailActionBarProps {
  task: Task;
}

export function TaskDetailActionBar({ task }: TaskDetailActionBarProps) {
  const { data: activeSession } = useActiveSession();
  const { start, stop } = useTimer();
  const { drive, chat, fire, pet } = useIntegrationActions(task);

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
      <IntegrationLinkButton icon={<Folder size={16} />} {...drive} />
      <IntegrationLinkButton icon={<MessageCircle size={16} />} {...chat} />
      <IntegrationLinkButton icon={<Flame size={16} />} {...fire} />
      <IntegrationLinkButton icon={<PawPrint size={16} />} {...pet} />

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
