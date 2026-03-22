import type { ReactNode } from 'react';
import { Play, Square, ExternalLink, Folder, MessageCircle, Flame, PawPrint } from 'lucide-react';
import { useActiveSession, useTimer, useElapsedTime } from '../../../hooks/useTimer';

interface DrawerActionBarProps {
  taskId?: string;
  projectType?: string;
}

export function DrawerActionBar({ taskId, projectType }: DrawerActionBarProps) {
  const { data: activeSession } = useActiveSession();
  const { start, stop } = useTimer();

  const isThisTaskActive =
    activeSession != null && activeSession.taskId === taskId && taskId != null;
  const isOtherTaskActive = activeSession != null && !isThisTaskActive;
  const { formatted } = useElapsedTime(
    isThisTaskActive && activeSession ? activeSession.startedAt : null
  );

  const handleTimerToggle = () => {
    if (!taskId || !projectType) return;

    if (isThisTaskActive && activeSession) {
      stop.mutate({
        sessionId: activeSession.id,
        projectType: activeSession.projectType ?? projectType,
      });
    } else {
      start.mutate({ taskId, projectType });
    }
  };

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
          <LinkButton icon={<Folder size={16} />} label="DRIVE作成" />
          <LinkButton icon={<MessageCircle size={16} />} label="CHAT作成" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <LinkButton icon={<Flame size={16} />} label="FIRE issue作成" />
          <LinkButton icon={<PawPrint size={16} />} label="PET issue作成" />
        </div>
      </div>

      {/* BACKLOGボタン */}
      <button
        type="button"
        className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary-default text-sm font-medium text-white transition-colors hover:bg-primary-hover"
      >
        <ExternalLink size={16} />
        BACKLOGを開く
      </button>
    </div>
  );
}

function LinkButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex h-10 items-center justify-center gap-1.5 rounded-md border border-border-default text-xs font-medium text-text-secondary transition-colors hover:bg-bg-secondary"
    >
      {icon}
      {label}
    </button>
  );
}
