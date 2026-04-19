import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface ToggleGroupItem {
  value: string;
  label: string;
  icon: ReactNode;
}

interface ToggleGroupProps {
  items: ToggleGroupItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ToggleGroup({ items, value, onChange, className }: ToggleGroupProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md border border-border-default p-0.5',
        className
      )}
      role="radiogroup"
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={item.label}
            onClick={() => onChange(item.value)}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-border-focus',
              isSelected
                ? 'bg-bg-primary text-text-primary shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {item.icon}
          </button>
        );
      })}
    </div>
  );
}
