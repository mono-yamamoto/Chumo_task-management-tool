import { Calendar } from 'lucide-react';

interface DateRangeRowProps {
  startDate: string;
  endDate: string;
}

export function DateRangeRow({ startDate, endDate }: DateRangeRowProps) {
  return (
    <div className="flex items-center gap-4">
      {/* 開始日 */}
      <div className="flex h-11 w-[220px] items-center justify-between rounded-lg border border-border-default bg-bg-primary px-3">
        <div className="flex flex-col">
          <span className="text-xs text-text-tertiary">開始日</span>
          <span className="text-sm text-text-primary">{startDate}</span>
        </div>
        <Calendar size={18} className="text-text-tertiary" />
      </div>

      {/* 終了日 */}
      <div className="flex h-11 w-[220px] items-center justify-between rounded-lg border border-border-default bg-bg-primary px-3">
        <div className="flex flex-col">
          <span className="text-xs text-text-tertiary">終了日</span>
          <span className="text-sm text-text-primary">{endDate}</span>
        </div>
        <Calendar size={18} className="text-text-tertiary" />
      </div>
    </div>
  );
}
