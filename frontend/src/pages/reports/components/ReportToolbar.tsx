import { ChevronLeft, ChevronRight, Calendar, Upload } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';

interface ReportToolbarProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onExport: () => void;
}

export function ReportToolbar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onExport,
}: ReportToolbarProps) {
  return (
    <div className="flex h-10 items-center justify-between">
      <div className="flex items-center gap-4">
        {/* 月ナビ */}
        <div className="flex items-center gap-2">
          <IconButton
            aria-label="前月"
            className="h-8 w-8 rounded-lg border border-border-default"
            onPress={onPrevMonth}
          >
            <ChevronLeft size={20} />
          </IconButton>
          <span className="text-lg font-bold text-text-primary">
            {year}年{month}月
          </span>
          <IconButton
            aria-label="次月"
            className="h-8 w-8 rounded-lg border border-border-default"
            onPress={onNextMonth}
          >
            <ChevronRight size={20} />
          </IconButton>
        </div>

        {/* 日付指定トグル */}
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-secondary"
        >
          <Calendar size={16} />
          <span>日付指定</span>
        </button>
      </div>

      {/* スプレッドシート出力 */}
      <Button variant="primary" size="sm" onPress={onExport}>
        <Upload size={16} />
        スプレッドシートに出力
      </Button>
    </div>
  );
}
