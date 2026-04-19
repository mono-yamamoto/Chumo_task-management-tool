import { type ReactNode } from 'react';
import { TextField, Input as AriaInput, type TextFieldProps } from 'react-aria-components';
import { cn } from '../../lib/utils';

interface InputProps extends Omit<TextFieldProps, 'children'> {
  placeholder?: string;
  icon?: ReactNode;
  inputClassName?: string;
}

export function Input({ icon, className, placeholder, inputClassName, ...props }: InputProps) {
  return (
    <TextField
      aria-label={props['aria-label'] ?? placeholder}
      className={cn('relative', className)}
      {...props}
    >
      {icon && (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary">
          {icon}
        </span>
      )}
      <AriaInput
        placeholder={placeholder}
        className={cn(
          'h-9 w-full rounded-md border border-border-default bg-bg-secondary px-3 text-sm text-text-primary',
          'placeholder:text-text-tertiary',
          'focus:border-border-focus focus:outline-none focus:ring-1 focus:ring-border-focus',
          'transition-colors',
          icon && 'pl-9',
          inputClassName
        )}
      />
    </TextField>
  );
}
