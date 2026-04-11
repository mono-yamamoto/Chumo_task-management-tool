import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Check } from 'lucide-react';
import { Avatar } from '../../../components/ui/Avatar';
import { IconButton } from '../../../components/ui/IconButton';
import { Select } from '../../../components/ui/Select';
import { useUpdateTask } from '../../../hooks/useTaskMutations';
import { useLabels } from '../../../hooks/useLabels';
import { useUsers } from '../../../hooks/useUsers';
import {
  FLOW_STATUS_OPTIONS,
  PROGRESS_STATUS_OPTIONS,
  toDateInputValue,
} from '../../../lib/constants';
import type { Task, FlowStatus, ProgressStatus } from '../../../types';

interface TaskBasicInfoProps {
  task: Task;
}

export function TaskBasicInfo({ task }: TaskBasicInfoProps) {
  const updateTask = useUpdateTask();
  const { data: labels = [] } = useLabels();
  const { data: users = [] } = useUsers();

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

  const handleUpdate = useCallback(
    (data: Record<string, unknown>) => {
      updateTask.mutate({ taskId: task.id, data });
    },
    [updateTask, task.id]
  );

  const kubunOptions = labels.map((l) => ({
    value: l.id,
    label: l.name,
  }));

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
    <div className="flex flex-col gap-3">
      <h2 className="text-md font-bold text-text-primary">基本情報</h2>

      <FormRow label="担当">
        <Select
          options={FLOW_STATUS_OPTIONS}
          value={task.flowStatus}
          placeholder="選択"
          onChange={(v) => {
            if (v) handleUpdate({ flowStatus: v as FlowStatus });
          }}
          className="flex-1"
        />
      </FormRow>

      {/* 進捗 */}
      <FormRow label="進捗">
        <Select
          options={PROGRESS_STATUS_OPTIONS}
          value={task.progressStatus ?? ''}
          placeholder="選択"
          onChange={(v) => handleUpdate({ progressStatus: (v as ProgressStatus) || null })}
          className="flex-1"
        />
      </FormRow>

      {/* ITアップ日 */}
      <FormRow label="ITアップ日">
        <input
          type="date"
          value={toDateInputValue(task.itUpDate)}
          onChange={(e) => handleUpdate({ itUpDate: e.target.value || null })}
          className="h-9 flex-1 rounded-sm border border-border-default bg-bg-secondary px-3 text-sm text-text-primary outline-none"
        />
      </FormRow>

      {/* リリース日 */}
      <FormRow label="リリース日">
        <input
          type="date"
          value={toDateInputValue(task.releaseDate)}
          onChange={(e) => handleUpdate({ releaseDate: e.target.value || null })}
          className="h-9 flex-1 rounded-sm border border-border-default bg-bg-secondary px-3 text-sm text-text-primary outline-none"
        />
      </FormRow>

      {/* 担当 */}
      <div className="flex h-10 items-center">
        <span className="w-[120px] shrink-0 text-sm text-text-secondary">担当</span>
        <div className="relative flex flex-1 items-center gap-1">
          {task.assigneeIds.map((id) => {
            const user = users.find((u) => u.id === id);
            return <Avatar key={id} name={user?.displayName ?? id} size="md" />;
          })}
          <div ref={popoverRef}>
            <IconButton
              aria-label="担当を追加"
              size="sm"
              className="rounded-full border border-border-default text-text-tertiary"
              onPress={() => setShowAssigneePopover((prev) => !prev)}
            >
              <Plus size={16} />
            </IconButton>
            {showAssigneePopover && (
              <div className="absolute left-0 top-full z-10 mt-1 max-h-60 w-64 overflow-y-auto rounded-md border border-border-default bg-bg-primary p-1 shadow-lg">
                {users.map((user) => {
                  const isAssigned = task.assigneeIds.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm text-text-primary hover:bg-bg-secondary"
                      onClick={() => toggleAssignee(user.id)}
                    >
                      {isAssigned ? (
                        <Check size={14} className="shrink-0 text-primary-default" />
                      ) : (
                        <span className="w-3.5 shrink-0" />
                      )}
                      <Avatar name={user.displayName} size="sm" className="h-6 w-6" />
                      <span>{user.displayName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 区分 */}
      <FormRow label="区分">
        <Select
          options={kubunOptions}
          value={task.kubunLabelId}
          placeholder="選択"
          onChange={(v) => {
            if (v) handleUpdate({ kubunLabelId: v });
          }}
          className="flex-1"
        />
      </FormRow>

      {/* 説明 */}
      <div className="flex flex-col gap-2 pt-3">
        <span className="text-sm font-medium text-text-secondary">説明</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={handleDescriptionBlur}
          placeholder="説明を入力..."
          className="h-[120px] w-full resize-y rounded-sm border border-border-default bg-bg-secondary p-3 text-sm leading-normal text-text-primary placeholder:text-text-tertiary focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus"
        />
      </div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-[120px] shrink-0 text-sm text-text-secondary">{label}</span>
      {children}
    </div>
  );
}
