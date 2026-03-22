import type { ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Task } from '../../../types';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import { FLOW_STATUS_LABELS } from '../../../lib/constants';
import { formatDate } from '../../../lib/taskUtils';
import { useUsers } from '../../../hooks/useUsers';
import { useLabels } from '../../../hooks/useLabels';

interface TaskDetailTabProps {
  task: Task;
}

export function TaskDetailTab({ task }: TaskDetailTabProps) {
  const { getUserById } = useUsers();
  const { getLabelById } = useLabels();

  const label = getLabelById(task.kubunLabelId);
  const assignees = task.assigneeIds
    .map((id) => getUserById(id))
    .filter((u): u is NonNullable<typeof u> => u != null);

  return (
    <div className="space-y-0">
      {/* 説明 */}
      <section className="pb-4">
        <SectionLabel>説明</SectionLabel>
        <div className="mt-2 rounded-md bg-bg-secondary p-3">
          <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">
            {task.description || <span className="text-text-tertiary">説明を入力...</span>}
          </p>
        </div>
      </section>

      <Divider />

      {/* プロパティ */}
      <section className="py-3">
        <PropertyRow label="担当">
          <PropertyValue>
            <span className="text-sm text-text-primary">{FLOW_STATUS_LABELS[task.flowStatus]}</span>
            <ChevronDown size={14} className="text-text-tertiary" />
          </PropertyValue>
        </PropertyRow>
        <PropertyRow label="進捗">
          <PropertyValue>
            {task.progressStatus ? (
              <Badge status={task.progressStatus} />
            ) : (
              <span className="text-sm text-text-tertiary">未設定</span>
            )}
            <ChevronDown size={14} className="text-text-tertiary" />
          </PropertyValue>
        </PropertyRow>
        <PropertyRow label="区分">
          <PropertyValue>
            <span className="text-sm text-text-primary">{label?.name ?? '未設定'}</span>
            <ChevronDown size={14} className="text-text-tertiary" />
          </PropertyValue>
        </PropertyRow>
      </section>

      <Divider />

      {/* スケジュール */}
      <section className="py-3">
        <PropertyRow label="ITアップ日">
          <PropertyValue>
            <span className="text-sm text-text-primary">{formatDate(task.itUpDate)}</span>
            <ChevronDown size={14} className="text-text-tertiary" />
          </PropertyValue>
        </PropertyRow>
        <PropertyRow label="リリース日">
          <PropertyValue>
            <span className="text-sm text-text-primary">{formatDate(task.releaseDate)}</span>
            <ChevronDown size={14} className="text-text-tertiary" />
          </PropertyValue>
        </PropertyRow>
      </section>

      {/* アサイン */}
      <section className="py-3">
        <SectionLabel>アサイン</SectionLabel>
        <div className="mt-2.5 flex items-center gap-2">
          {assignees.map((user) => (
            <Avatar key={user.id} name={user.displayName} size="md" />
          ))}
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border-default text-text-tertiary transition-colors hover:bg-bg-secondary"
            aria-label="アサインを追加"
          >
            +
          </button>
        </div>
      </section>

      <Divider />

      {/* セッション履歴（Phase 5 で API 接続予定） */}
      <section className="py-3">
        <span className="text-xs font-medium text-text-tertiary">セッション履歴</span>
        <p className="mt-2 text-sm text-text-tertiary">セッション履歴はありません</p>
      </section>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <span className="text-xs font-bold tracking-wide text-text-tertiary">{children}</span>;
}

function PropertyRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex h-10 items-center py-1">
      <span className="w-24 shrink-0 text-sm text-text-secondary">{label}</span>
      {children}
    </div>
  );
}

function PropertyValue({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-8 flex-1 items-center justify-between rounded-sm bg-bg-secondary px-2.5">
      {children}
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-border-default" />;
}
