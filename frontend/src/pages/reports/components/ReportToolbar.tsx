import { ChevronLeft, ChevronRight, Calendar, Upload, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { IconButton } from '../../../components/ui/IconButton';
import { usePreviewMode } from '../../../hooks/usePreviewMode';
import { useToast } from '../../../hooks/useToast';

const REPORT_DRIVE_FOLDER_URL =
  'https://drive.google.com/drive/u/1/folders/1fw86FpPA_5dWAo6WW7RKM8DuU0aD5YNH';

interface ReportToolbarProps {
  year: number;
  month: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onExport: () => void;
  isExporting?: boolean;
  showDateRange?: boolean;
  onToggleDateRange?: () => void;
}

export function ReportToolbar({
  year,
  month,
  onPrevMonth,
  onNextMonth,
  onExport,
  isExporting = false,
  showDateRange = false,
  onToggleDateRange,
}: ReportToolbarProps) {
  const { isPreview } = usePreviewMode();
  const { addToast } = useToast();

  const handlePreviewBlock = () => {
    addToast('プレビューモードでは外部サービスへの連携はできません', 'warning');
  };

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
        <Button
          variant={showDateRange ? 'primary' : 'outline'}
          size="sm"
          className={`rounded-lg ${showDateRange ? '' : 'text-text-secondary'}`}
          onPress={onToggleDateRange}
        >
          <Calendar size={16} />
          日付指定
        </Button>
      </div>

      <div className="flex items-center gap-2">
        {/* Driveフォルダを開く */}
        <Button
          variant="secondary"
          size="sm"
          onPress={
            isPreview ? handlePreviewBlock : () => window.open(REPORT_DRIVE_FOLDER_URL, '_blank')
          }
        >
          <ExternalLink size={16} />
          Drive
        </Button>

        {/* スプレッドシート出力 */}
        <Button
          variant="primary"
          size="sm"
          onPress={isPreview ? handlePreviewBlock : onExport}
          isDisabled={isExporting}
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {isExporting ? '出力中...' : 'スプレッドシートに出力'}
        </Button>
      </div>
    </div>
  );
}
