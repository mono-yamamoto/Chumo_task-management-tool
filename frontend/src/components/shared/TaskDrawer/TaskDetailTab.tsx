import { type ReactNode, useState, useEffect, useRef } from 'react';
import { Plus, Check, Pencil } from 'lucide-react';
import type { Task, FlowStatus, ProgressStatus, TaskSession } from '../../../types';
import { Avatar } from '../../ui/Avatar';
import { IconButton } from '../../ui/IconButton';
import { Select } from '../../ui/Select';
import { Spinner } from '../../ui/Spinner';
import { Modal } from '../../ui/Modal';
import { SessionEditModalContent } from '../../../pages/reports/components/SessionEditModalContent';
import { useUpdateTask } from '../../../hooks/useTaskMutations';
import { useUsers } from '../../../hooks/useUsers';
import { useLabels } from '../../../hooks/useLabels';
import { useAuth } from '../../../hooks/useAuth';
import { useTaskSessions } from '../../../hooks/useTimer';
import { formatDuration } from '../../../lib/taskUtils';
import {
  FLOW_STATUS_OPTIONS,
  PROGRESS_STATUS_OPTIONS,
  toDateInputValue,
  formatTime as fmtTime,
} from '../../../lib/constants';

interface TaskDetailTabProps {
  task: Task;
}

export function TaskDetailTab({ task }: TaskDetailTabProps) {
  const updateTask = useUpdateTask();
  const { getUserById, data: users = [] } = useUsers();
  const { data: labels = [] } = useLabels();

  const [description, setDescription] = useState(task.description ?? '');
  const [showAssigneePopover, setShowAssigneePopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDescription(task.description ?? '');
  }, [task.description]);

  // クリック外でポップオーバーを閉じる
  useEffect(() => {
    if (!showAssigneePopover) return;
    const handleClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowAssigneePopover(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showAssigneePopover]);

  const handleUpdate = (data: Record<string, unknown>) => {
    updateTask.mutate({ taskId: task.id, data });
  };

  const kubunOptions = labels.map((l) => ({ value: l.id, label: l.name }));

  const assignees = task.assigneeIds
    .map((id) => getUserById(id))
    .filter((u): u is NonNullable<typeof u> => u != null);

  const toggleAssignee = (userId: string) => {
    const current = task.assigneeIds;
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    handleUpdate({ assigneeIds: next });
  };

  const handleDescriptionBlur = () => {
    if (description !== (task.description ?? '')) {
      handleUpdate({ description });
    }
  };

  return (
    <div className="space-y-0">
      {/* 説明 */}
      <section className="pb-4">
        <SectionLabel>説明</SectionLabel>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="説明を入力..."
          className="mt-2 h-24 w-full resize-y rounded-md bg-bg-secondary p-3 text-sm leading-relaxed text-text-secondary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
      </section>

      <Divider />

      {/* プロパティ */}
      <section className="py-3">
        <PropertyRow label="担当">
          <Select
            options={FLOW_STATUS_OPTIONS}
            value={task.flowStatus}
            placeholder="選択"
            onChange={(v) => {
              if (v) handleUpdate({ flowStatus: v as FlowStatus });
            }}
            className="flex-1"
          />
        </PropertyRow>
        <PropertyRow label="進捗">
          <Select
            options={PROGRESS_STATUS_OPTIONS}
            value={task.progressStatus ?? ''}
            placeholder="未設定"
            onChange={(v) => handleUpdate({ progressStatus: (v as ProgressStatus) || null })}
            className="flex-1"
          />
        </PropertyRow>
        <PropertyRow label="区分">
          <Select
            options={kubunOptions}
            value={task.kubunLabelId}
            placeholder="選択"
            onChange={(v) => {
              if (v) handleUpdate({ kubunLabelId: v });
            }}
            className="flex-1"
          />
        </PropertyRow>
      </section>

      <Divider />

      {/* スケジュール */}
      <section className="py-3">
        <PropertyRow label="ITアップ日">
          <input
            type="date"
            value={toDateInputValue(task.itUpDate)}
            onChange={(e) => handleUpdate({ itUpDate: e.target.value || null })}
            className="h-8 flex-1 rounded-sm bg-bg-secondary px-2.5 text-sm text-text-primary outline-none"
          />
        </PropertyRow>
        <PropertyRow label="リリース日">
          <input
            type="date"
            value={toDateInputValue(task.releaseDate)}
            onChange={(e) => handleUpdate({ releaseDate: e.target.value || null })}
            className="h-8 flex-1 rounded-sm bg-bg-secondary px-2.5 text-sm text-text-primary outline-none"
          />
        </PropertyRow>
      </section>

      {/* アサイン */}
      <section className="py-3">
        <SectionLabel>アサイン</SectionLabel>
        <div className="relative mt-2.5 flex items-center gap-2">
          {assignees.map((user) => (
            <Avatar
              key={user.id}
              name={user.displayName}
              imageUrl={user.avatarUrl ?? undefined}
              colorName={user.avatarColor}
              size="md"
            />
          ))}
          <div ref={popoverRef}>
            <IconButton
              aria-label="アサインを追加"
              size="sm"
              className="rounded-full border border-border-default text-text-tertiary"
              onPress={() => setShowAssigneePopover((prev) => !prev)}
            >
              <Plus size={16} />
            </IconButton>
            {showAssigneePopover && (
              <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-56 overflow-y-auto rounded-md border border-border-default bg-bg-primary p-1 shadow-lg">
                {users.map((user) => {
                  const isAssigned = task.assigneeIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2.5 py-1.5 text-sm text-text-primary hover:bg-bg-secondary"
                      onClick={() => toggleAssignee(user.id)}
                    >
                      {isAssigned ? (
                        <Check size={14} className="shrink-0 text-primary-default" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <Avatar name={user.displayName} size="sm" className="h-5 w-5" />
                      <span className="truncate">{user.displayName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <Divider />

      {/* セッション履歴 */}
      <SessionHistory taskId={task.id} projectType={task.projectType} />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-bold tracking-wide text-text-tertiary">{children}</span>;
}

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center py-1">
      <span className="w-24 shrink-0 text-sm text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function SessionHistory({ taskId, projectType }: { taskId: string; projectType: string }) {
  const { data: sessions, isLoading } = useTaskSessions(taskId, projectType);
  const { getUserName, getUserById } = useUsers();
  const { userId } = useAuth();
  const [editingSession, setEditingSession] = useState<TaskSession | null>(null);

  const totalSec = sessions?.reduce((sum, s) => sum + s.durationSec, 0) ?? 0;

  return (
    <section className="py-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-tertiary">セッション履歴</span>
        {sessions && sessions.length > 0 && (
          <span className="text-xs font-medium text-text-secondary">
            合計: {formatDuration(totalSec)}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="mt-2 space-y-0">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              getUserName={getUserName}
              getUserById={getUserById}
              isOwn={session.userId === userId}
              onEdit={() => setEditingSession(session)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-text-tertiary">セッション履歴はありません</p>
      )}

      <Modal
        isOpen={editingSession != null}
        onClose={() => setEditingSession(null)}
        title="セッション時間の編集"
      >
        {editingSession && (
          <SessionEditModalContent
            session={editingSession}
            onCancel={() => setEditingSession(null)}
            onSaved={() => setEditingSession(null)}
          />
        )}
      </Modal>
    </section>
  );
}

function SessionRow({
  session,
  getUserName,
  getUserById,
  isOwn,
  onEdit,
}: {
  session: TaskSession;
  getUserName: (id: string) => string;
  getUserById: (
    id: string
  ) => { avatarUrl?: string | null; avatarColor?: string | null } | undefined;
  isOwn: boolean;
  onEdit: () => void;
}) {
  const name = getUserName(session.userId);
  const user = getUserById(session.userId);
  const start = new Date(session.startedAt);
  const end = session.endedAt ? new Date(session.endedAt) : null;

  const timeStr = end ? `${fmtTime(start)} - ${fmtTime(end)}` : `${fmtTime(start)} - 計測中`;

  return (
    <div className="flex items-center gap-2 py-2">
      <Avatar
        name={name}
        imageUrl={user?.avatarUrl ?? undefined}
        colorName={user?.avatarColor}
        size="sm"
        className="h-6 w-6 shrink-0"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-text-primary">{name}</span>
        <span className="text-xs text-text-tertiary">{timeStr}</span>
      </div>
      <span className="shrink-0 text-sm text-text-secondary">
        {formatDuration(session.durationSec)}
      </span>
      {isOwn && (
        <IconButton
          onPress={onEdit}
          aria-label="セッションを編集"
          size="sm"
          className="shrink-0 text-text-tertiary hover:text-text-primary"
        >
          <Pencil size={14} />
        </IconButton>
      )}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border-default" />;
}
