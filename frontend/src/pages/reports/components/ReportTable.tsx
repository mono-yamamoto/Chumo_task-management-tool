import type { ReportEntry } from '../../../types';
import { formatDuration } from '../../../lib/taskUtils';

interface ReportTableProps {
  entries: ReportEntry[];
  onRowClick: (entry: ReportEntry) => void;
}

export function ReportTable({ entries, onRowClick }: ReportTableProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border-default bg-bg-primary">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-default px-4 py-2.5">
        <span className="flex-1 text-sm font-medium text-primary-default">タイトル</span>
        <span className="w-[140px] text-center text-sm font-medium text-primary-default">時間</span>
        <span className="w-[240px] text-sm font-medium text-primary-default">3時間超過理由</span>
      </div>

      {/* Rows */}
      {entries.map((entry, i) => (
        <div key={entry.id}>
          {i > 0 && <div className="h-px bg-border-default" />}
          <button
            type="button"
            onClick={() => onRowClick(entry)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-bg-secondary"
          >
            <span className="flex-1 truncate text-sm text-text-primary">{entry.title}</span>
            <span className="w-[140px] text-center text-sm text-text-secondary">
              {formatDuration(entry.totalDurationSec)}
            </span>
            <span className="w-[240px] text-sm text-text-primary">
              {entry.over3Reason ? (
                entry.over3Reason
              ) : (
                <span className="text-text-tertiary">-</span>
              )}
            </span>
          </button>
        </div>
      ))}

      {entries.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-text-tertiary">
          レポートデータがありません
        </div>
      )}
    </div>
  );
}
