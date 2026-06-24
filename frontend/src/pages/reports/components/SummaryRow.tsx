import { formatDuration } from '../../../lib/taskUtils';

interface SummaryRowProps {
  totalDurationSec: number;
  entryCount: number;
  /** カウントの単位（デフォルト: '件'）。パートナータブでは '人' を渡す */
  countUnit?: string;
}

export function SummaryRow({ totalDurationSec, entryCount, countUnit = '件' }: SummaryRowProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base font-medium text-text-secondary">合計:</span>
      <span className="text-xl font-bold text-text-primary">
        {formatDuration(totalDurationSec)}
      </span>
      <span className="inline-flex rounded-full bg-bg-brand-subtle px-2 py-0.5 text-xs font-medium text-primary-default">
        {entryCount}
        {countUnit}
      </span>
    </div>
  );
}
