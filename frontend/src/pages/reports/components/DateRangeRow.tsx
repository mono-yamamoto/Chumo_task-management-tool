import { Calendar } from 'lucide-react';

interface DateRangeRowProps {
  startDate: string;
  endDate: string;
  onStartDateChange?: (date: string) => void;
  onEndDateChange?: (date: string) => void;
}

function toInputFormat(slashDate: string): string {
  return slashDate.replace(/\//g, '-');
}

export function DateRangeRow({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: DateRangeRowProps) {
  return (
    <div className="flex items-center gap-4">
      {/* 開始日 */}
      <div className="flex h-11 w-[220px] items-center justify-between rounded-lg border border-border-default bg-bg-primary px-3">
        <div className="flex flex-1 flex-col">
          <span className="text-xs text-text-tertiary">開始日</span>
          <input
            type="date"
            value={toInputFormat(startDate)}
            onChange={(e) => onStartDateChange?.(e.target.value)}
            aria-label="開始日"
            className="bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
        <Calendar size={18} className="pointer-events-none text-text-tertiary" />
      </div>

      {/* 終了日 */}
      <div className="flex h-11 w-[220px] items-center justify-between rounded-lg border border-border-default bg-bg-primary px-3">
        <div className="flex flex-1 flex-col">
          <span className="text-xs text-text-tertiary">終了日</span>
          <input
            type="date"
            value={toInputFormat(endDate)}
            onChange={(e) => onEndDateChange?.(e.target.value)}
            aria-label="終了日"
            className="bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
        <Calendar size={18} className="pointer-events-none text-text-tertiary" />
      </div>
    </div>
  );
}
