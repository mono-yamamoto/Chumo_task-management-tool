import { memo } from 'react';
import { Square, Timer } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { useActiveSession, useTimer, useElapsedTime } from '../../hooks/useTimer';

/**
 * ヘッダーに表示するコンパクトなタイマーウィジェット
 * memo 化して毎秒の再レンダーが親に伝播しないようにする
 */
export const TimerWidget = memo(function TimerWidget() {
  const { data: activeSession, cached } = useActiveSession();
  const { stop } = useTimer();

  const session = activeSession ?? null;
  const startedAt = session?.startedAt ?? cached?.startedAt ?? null;
  const { formatted } = useElapsedTime(startedAt);

  if (!session && !cached) return null;

  const sessionId = session?.id ?? cached?.sessionId ?? '';
  const projectType = session?.projectType ?? cached?.projectType ?? '';

  const handleStop = () => {
    if (!sessionId || !projectType) return;
    stop.mutate({ sessionId, projectType });
  };

  return (
    <div className="flex items-center gap-2 rounded-lg border border-primary-default bg-bg-brand-subtle px-3 py-1.5">
      <Timer size={16} className="text-primary-default animate-pulse" />
      <span className="text-sm font-mono font-medium text-primary-default">{formatted}</span>
      <IconButton
        onPress={handleStop}
        isDisabled={stop.isPending}
        aria-label="タイマー停止"
        size="sm"
        className="h-6 w-6 rounded text-primary-default hover:bg-primary-default hover:text-white"
      >
        <Square size={12} fill="currentColor" />
      </IconButton>
    </div>
  );
});
