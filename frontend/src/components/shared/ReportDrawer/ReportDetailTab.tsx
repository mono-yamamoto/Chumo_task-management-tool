import { useEffect, useState, useMemo } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '../../ui/Button';
import { IconButton } from '../../ui/IconButton';
import { Avatar } from '../../ui/Avatar';
import { Spinner } from '../../ui/Spinner';
import { UnrecordedMembersSection } from '../UnrecordedMembersSection';
import type { ReportEntry, TaskSession } from '../../../types';
import { formatDuration } from '../../../lib/taskUtils';
import { formatDateTime as fmtDateTime, formatTime as fmtTime } from '../../../lib/constants';
import { useUpdateTask } from '../../../hooks/useTaskMutations';
import { useTask } from '../../../hooks/useTask';
import { useUsers } from '../../../hooks/useUsers';
import { useTaskSessions } from '../../../hooks/useTimer';

const EMPTY_SESSIONS: TaskSession[] = [];

interface ReportDetailTabProps {
  entry: ReportEntry;
  onEditSession: (entry: ReportEntry, session: TaskSession) => void;
}

export function ReportDetailTab({ entry, onEditSession }: ReportDetailTabProps) {
  const [reason, setReason] = useState(entry.over3Reason ?? '');
  const updateTask = useUpdateTask();
  const { data: task } = useTask(entry.taskId);
  const { getUserName, getUserById } = useUsers();
  const { data: fetchedSessions, isLoading: isLoadingSessions } = useTaskSessions(
    entry.taskId,
    entry.projectType
  );
  const sessions = fetchedSessions ?? EMPTY_SESSIONS;

  useEffect(() => {
    setReason(entry.over3Reason ?? '');
  }, [entry]);

  const totalSec = sessions.reduce((sum, s) => sum + s.durationSec, 0);

  const recordedUserIds = useMemo(() => new Set(sessions.map((s) => s.userId)), [sessions]);

  const unrecordedMembers = useMemo(() => {
    if (!task?.assigneeIds) return [];
    return task.assigneeIds.filter((id) => !recordedUserIds.has(id));
  }, [task?.assigneeIds, recordedUserIds]);

  return (
    <div className="space-y-0">
      {/* 3時間超過理由 */}
      <div className="space-y-2 px-6 py-5 border-b border-border-default">
        <label htmlFor="over3Reason" className="text-xs font-medium text-text-tertiary">
          3時間超過理由
        </label>
        <textarea
          id="over3Reason"
          aria-describedby="over3ReasonHelp"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="3時間を超過した場合は理由を記入してください"
          className="h-[100px] w-full resize-none rounded-lg border border-border-default bg-bg-secondary px-3 py-3 text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
        <p id="over3ReasonHelp" className="text-xs text-text-tertiary">
          3時間を超過した場合は理由を記入してください
        </p>
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            isDisabled={reason === (entry.over3Reason ?? '') || updateTask.isPending}
            onPress={() =>
              updateTask.mutate({ taskId: entry.taskId, data: { over3Reason: reason } })
            }
          >
            {updateTask.isPending ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>

      {/* セッション履歴 */}
      <div className="space-y-2 px-6 py-4 border-b border-border-default">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-text-tertiary">セッション履歴</span>
          <span className="text-xs font-medium text-text-secondary">
            合計: {formatDuration(totalSec)}
          </span>
        </div>

        {isLoadingSessions ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="space-y-0">
            {sessions.map((session) => {
              const user = getUserById(session.userId);
              return (
                <SessionRow
                  key={session.id}
                  session={session}
                  userName={getUserName(session.userId)}
                  avatarUrl={user?.avatarUrl ?? undefined}
                  avatarColor={user?.avatarColor}
                  onEdit={() => onEditSession(entry, session)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* セッション未記録メンバー */}
      {unrecordedMembers.length > 0 && (
        <UnrecordedMembersSection
          taskId={entry.taskId}
          unrecordedMemberIds={unrecordedMembers}
          sessionReminders={task?.sessionReminders}
        />
      )}
    </div>
  );
}

interface SessionRowProps {
  session: TaskSession;
  userName: string;
  avatarUrl?: string;
  avatarColor?: string | null;
  onEdit: () => void;
}

function SessionRow({ session, userName, avatarUrl, avatarColor, onEdit }: SessionRowProps) {
  const startStr = fmtDateTime(session.startedAt);
  const endStr = session.endedAt ? fmtTime(session.endedAt) : '-';
  const duration = formatDuration(session.durationSec);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Avatar name={userName} imageUrl={avatarUrl} colorName={avatarColor} size="sm" />
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-text-primary">{userName}</span>
          <span className="text-xs text-text-tertiary">
            {startStr} - {endStr}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-text-secondary">{duration}</span>
        <IconButton
          onPress={onEdit}
          aria-label="セッションを編集"
          size="sm"
          className="text-text-tertiary hover:text-text-primary"
        >
          <Pencil size={16} />
        </IconButton>
      </div>
    </div>
  );
}
