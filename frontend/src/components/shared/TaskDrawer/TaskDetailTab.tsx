import type { ReactNode } from 'react';
import { ChevronDown, ExternalLink } from 'lucide-react';
import type { Task } from '../../../types';
import { Badge } from '../../ui/Badge';
import { Avatar } from '../../ui/Avatar';
import { IconButton } from '../../ui/IconButton';
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
            <Avatar
              key={user.id}
              name={user.displayName}
              imageUrl={user.avatarUrl ?? undefined}
              colorName={user.avatarColor}
              size="md"
            />
          ))}
          <IconButton
            aria-label="アサインを追加"
            size="sm"
            className="rounded-full border border-border-default text-text-tertiary"
          >
            +
          </IconButton>
        </div>
      </section>

      {/* 外部連携 */}
      {hasIntegrationUrls(task) && (
        <>
          <Divider />
          <section className="py-3">
            <SectionLabel>外部連携</SectionLabel>
            <div className="mt-2 space-y-1.5">
              {task.googleDriveUrl && (
                <IntegrationLink label="Google Drive" url={task.googleDriveUrl} />
              )}
              {task.googleChatThreadUrl && (
                <IntegrationLink label="Google Chat" url={task.googleChatThreadUrl} />
              )}
              {task.fireIssueUrl && <IntegrationLink label="Fire Issue" url={task.fireIssueUrl} />}
              {task.petIssueUrl && <IntegrationLink label="PET Issue" url={task.petIssueUrl} />}
              {task.backlogUrl && <IntegrationLink label="Backlog" url={task.backlogUrl} />}
            </div>
          </section>
        </>
      )}

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

function IntegrationLink({ label, url }: { label: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-primary-default transition-colors hover:bg-bg-brand-subtle"
    >
      <ExternalLink size={14} />
      {label}
    </a>
  );
}

function hasIntegrationUrls(task: Task): boolean {
  return !!(
    task.googleDriveUrl ||
    task.googleChatThreadUrl ||
    task.fireIssueUrl ||
    task.petIssueUrl ||
    task.backlogUrl
  );
}

function Divider() {
  return <div className="h-px bg-border-default" />;
}
