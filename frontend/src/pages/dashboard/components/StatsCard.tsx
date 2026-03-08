import type { ReactNode } from 'react';
import { cn } from '../../../lib/utils';

interface StatsCardProps {
  label: string;
  value: number;
  icon: ReactNode;
  variant?: 'default' | 'warning' | 'error' | 'success';
}

const iconBgStyles = {
  default: 'text-info-text bg-info-bg',
  warning: 'text-warning-text bg-warning-bg',
  error: 'text-error-text bg-error-bg',
  success: 'text-success-text bg-success-bg',
} as const;

export function StatsCard({ label, value, icon, variant = 'default' }: StatsCardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-bg-primary p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-md',
            iconBgStyles[variant]
          )}
        >
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold leading-tight text-text-primary">{value}</p>
    </div>
  );
}
