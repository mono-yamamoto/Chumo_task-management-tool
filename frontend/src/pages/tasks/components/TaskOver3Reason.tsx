import { useEffect, useRef, useState } from 'react';
import { useTaskSessions } from '../../../hooks/useTimer';
import { useUpdateTask } from '../../../hooks/useTaskMutations';
import { OVER_3_HOURS_THRESHOLD_SEC } from '../../../lib/constants';
import type { Task } from '../../../types';

interface TaskOver3ReasonProps {
  task: Task;
}

export function TaskOver3Reason({ task }: TaskOver3ReasonProps) {
  const { data: sessions } = useTaskSessions(task.id, task.projectType);
  const totalSec = sessions?.reduce((sum, s) => sum + s.durationSec, 0) ?? 0;
  const isOver3Hours = totalSec > OVER_3_HOURS_THRESHOLD_SEC;

  const [reason, setReason] = useState(task.over3Reason ?? '');
  const updateTask = useUpdateTask();

  useEffect(() => {
    setReason(task.over3Reason ?? '');
  }, [task.over3Reason, task.id]);

  // ページ離脱時など onBlur が間に合わないケースに備え、cleanup でも保存する
  const reasonRef = useRef(reason);
  reasonRef.current = reason;
  const propsRef = useRef({ taskId: task.id, initial: task.over3Reason ?? '' });
  propsRef.current = { taskId: task.id, initial: task.over3Reason ?? '' };
  const mutateRef = useRef(updateTask.mutate);
  mutateRef.current = updateTask.mutate;
  useEffect(() => {
    return () => {
      const { taskId, initial } = propsRef.current;
      if (reasonRef.current !== initial) {
        mutateRef.current({ taskId, data: { over3Reason: reasonRef.current } });
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-md font-bold text-text-primary">3時間超過理由</h2>
      {isOver3Hours ? (
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          onBlur={() => {
            if (reason !== (task.over3Reason ?? '')) {
              updateTask.mutate({ taskId: task.id, data: { over3Reason: reason } });
            }
          }}
          placeholder="3時間を超過した理由を記入してください"
          className="h-[100px] w-full resize-none rounded-lg border border-border-default bg-bg-secondary px-3 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
      ) : (
        <p className="text-sm text-text-tertiary">
          合計作業時間が3時間を超えると入力欄が表示されます。
        </p>
      )}
    </div>
  );
}
