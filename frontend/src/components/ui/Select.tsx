import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  active?: boolean;
  className?: string;
  onChange?: (value: string) => void;
}

export function Select({
  label,
  options,
  value,
  placeholder = 'すべて',
  active = false,
  className,
  onChange,
}: SelectProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? placeholder;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && <span className="text-xs font-medium text-text-secondary">{label}</span>}
      <button
        type="button"
        className={cn(
          'flex h-9 items-center justify-between rounded-md border px-3 text-sm transition-colors',
          active
            ? 'border-primary-default bg-bg-brand-subtle text-primary-default'
            : 'border-border-default bg-bg-primary text-text-primary hover:bg-bg-secondary'
        )}
        onClick={() => onChange?.(value ?? '')}
      >
        <span className={cn(!value && !active && 'text-text-tertiary')}>{selectedLabel}</span>
        <ChevronDown size={14} className="ml-2 shrink-0 text-text-tertiary" />
      </button>
    </div>
  );
}
