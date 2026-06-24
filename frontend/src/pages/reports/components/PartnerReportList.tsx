import { UserSectionHeader } from '../../../components/shared/UserSectionHeader';
import { formatDuration } from '../../../lib/taskUtils';
import { ROLE_LABELS_JA } from '../../../lib/roleLabels';
import type { PartnerReportItem } from '../../../hooks/usePartnerReport';

interface PartnerReportListProps {
  partners: PartnerReportItem[];
  onTaskClick: (taskId: string) => void;
}

export function PartnerReportList({ partners, onTaskClick }: PartnerReportListProps) {
  if (partners.length === 0) {
    return (
      <div className="rounded-xl border border-border-default bg-bg-primary px-4 py-8 text-center text-sm text-text-tertiary">
        パートナーの稼働データがありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {partners.map((partner) => (
        <PartnerSection key={partner.userId} partner={partner} onTaskClick={onTaskClick} />
      ))}
    </div>
  );
}

interface PartnerSectionProps {
  partner: PartnerReportItem;
  onTaskClick: (taskId: string) => void;
}

function PartnerSection({ partner, onTaskClick }: PartnerSectionProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      <div className="border-b border-border-default">
        <UserSectionHeader
          displayName={partner.displayName}
          roleLabel={ROLE_LABELS_JA.partner}
          avatarUrl={partner.avatarUrl}
          avatarColor={partner.avatarColor}
          count={partner.tasks.length}
          rightSlot={
            <span className="text-sm font-bold text-text-primary">
              {formatDuration(partner.totalDurationSec)}
            </span>
          }
        />
      </div>

      {/* タスクテーブル */}
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-2">
        <span className="flex-1 text-xs font-medium text-primary-default">タイトル</span>
        <span className="w-[120px] text-xs font-medium text-primary-default">区分</span>
        <span className="w-[120px] text-center text-xs font-medium text-primary-default">時間</span>
      </div>

      {partner.tasks.map((task, i) => (
        <div key={task.taskId}>
          {i > 0 && <div className="h-px bg-border-default" />}
          <button
            type="button"
            onClick={() => onTaskClick(task.taskId)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-bg-secondary"
          >
            <span className="flex-1 truncate text-sm text-text-primary">{task.title}</span>
            <span className="w-[120px] truncate text-xs text-text-secondary">
              {task.projectType}
            </span>
            <span className="w-[120px] text-center text-sm text-text-secondary">
              {formatDuration(task.durationSec)}
            </span>
          </button>
        </div>
      ))}
    </div>
  );
}
