import { useMemo } from 'react';
import { UnrecordedMembersSection } from '../../../components/shared/UnrecordedMembersSection';
import { useTaskSessions } from '../../../hooks/useTimer';
import type { Task } from '../../../types';

interface TaskUnrecordedMembersProps {
  task: Task;
}

export function TaskUnrecordedMembers({ task }: TaskUnrecordedMembersProps) {
  const { data: sessions, isLoading } = useTaskSessions(task.id, task.projectType);

  const recordedUserIds = useMemo(() => new Set((sessions ?? []).map((s) => s.userId)), [sessions]);

  const unrecordedMembers = useMemo(
    () => task.assigneeIds.filter((id) => !recordedUserIds.has(id)),
    [task.assigneeIds, recordedUserIds]
  );

  if (isLoading || unrecordedMembers.length === 0) return null;

  return (
    <UnrecordedMembersSection
      taskId={task.id}
      unrecordedMemberIds={unrecordedMembers}
      sessionReminders={task.sessionReminders}
    />
  );
}
