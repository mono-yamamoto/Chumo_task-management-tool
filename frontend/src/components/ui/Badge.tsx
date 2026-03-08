import type { ProgressStatus } from '../../types';
import { PROGRESS_STATUS_COLOR_MAP } from '../../lib/constants';
import { cn } from '../../lib/utils';

interface BadgeProps {
  status: ProgressStatus;
  className?: string;
}

export function Badge({ status, className }: BadgeProps) {
  const colorClass = PROGRESS_STATUS_COLOR_MAP[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold text-white',
        colorClass,
        className
      )}
    >
      {status}
    </span>
  );
}
