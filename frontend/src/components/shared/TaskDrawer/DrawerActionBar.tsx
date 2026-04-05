import { useNavigate } from 'react-router-dom';
import { Play, Square, ExternalLink, Folder, MessageCircle, Flame, PawPrint } from 'lucide-react';
import { Button } from '../../ui/Button';
import { IntegrationLinkButton } from '../../ui/IntegrationLinkButton';
import { useActiveSession, useTimer, useElapsedTime } from '../../../hooks/useTimer';
import { useIntegrationActions } from '../../../hooks/useIntegrationActions';
import { openExternal } from '../../../lib/utils';
import type { Task } from '../../../types';

interface DrawerActionBarProps {
  task: Task;
}

export function DrawerActionBar({ task }: DrawerActionBarProps) {
  const navigate = useNavigate();
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
          <IntegrationLinkButton icon={<Folder size={16} />} size="lg" {...drive} />
          <IntegrationLinkButton icon={<MessageCircle size={16} />} size="lg" {...chat} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <IntegrationLinkButton icon={<Flame size={16} />} size="lg" {...fire} />
          <IntegrationLinkButton icon={<PawPrint size={16} />} size="lg" {...pet} />
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
