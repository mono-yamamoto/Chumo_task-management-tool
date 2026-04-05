import { ChevronDown } from 'lucide-react';
import {
  Select as AriaSelect,
  Button as AriaButton,
  Label,
  SelectValue,
  Popover,
  ListBox,
  ListBoxItem,
  type Key,
} from 'react-aria-components';
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

const PLACEHOLDER_KEY = '__placeholder__';

export function Select({
  label,
  options,
  value,
  placeholder = 'すべて',
  active = false,
  className,
  onChange,
}: SelectProps) {
  return (
    <AriaSelect
      aria-label={label ?? placeholder}
      selectedKey={value || PLACEHOLDER_KEY}
      onSelectionChange={(key: Key | null) => {
        if (key == null) return;
        onChange?.(key === PLACEHOLDER_KEY ? '' : String(key));
      }}
      className={cn('flex flex-col gap-1', className)}
    >
      {label && <Label className="text-xs font-medium text-text-secondary">{label}</Label>}
      <AriaButton
        className={cn(
          'flex h-9 items-center justify-between rounded-md border px-3 text-sm transition-colors cursor-pointer',
          active
            ? 'border-primary-default bg-bg-brand-subtle text-primary-default'
            : 'border-border-default bg-bg-primary text-text-primary hover:bg-bg-secondary'
        )}
      >
        <SelectValue className={cn(!value && !active && 'text-text-tertiary')} />
        <ChevronDown size={14} className="ml-2 shrink-0 text-text-tertiary" />
      </AriaButton>
      <Popover className="w-[--trigger-width] rounded-md border border-border-default bg-bg-primary shadow-lg">
        <ListBox className="max-h-60 overflow-y-auto p-1">
          <ListBoxItem
            id={PLACEHOLDER_KEY}
            textValue={placeholder}
            className="cursor-pointer rounded px-3 py-1.5 text-sm text-text-tertiary outline-none data-[focused]:bg-bg-secondary"
          >
            {placeholder}
          </ListBoxItem>
          {options.map((option) => (
            <ListBoxItem
              key={option.value}
              id={option.value}
              textValue={option.label}
              className="cursor-pointer rounded px-3 py-1.5 text-sm text-text-primary outline-none data-[focused]:bg-bg-secondary data-[selected]:font-medium data-[selected]:text-primary-default"
            >
              {option.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
}
