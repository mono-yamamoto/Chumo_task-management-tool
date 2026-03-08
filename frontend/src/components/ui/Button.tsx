import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '../../lib/utils';

const variantStyles = {
  primary: 'bg-primary-default text-text-inverse hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'bg-bg-tertiary text-text-primary hover:bg-neutral-300 active:bg-neutral-400 dark:hover:bg-neutral-600 dark:active:bg-neutral-500',
  outline:
    'border border-border-default text-text-primary hover:bg-bg-secondary active:bg-bg-tertiary',
  ghost: 'text-text-primary hover:bg-bg-secondary active:bg-bg-tertiary',
  destructive: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
} as const;

const sizeStyles = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-9 px-4 text-md gap-2',
  lg: 'h-10 px-5 text-md gap-2',
} as const;

export interface ButtonProps extends AriaButtonProps {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
}

export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  return (
    <AriaButton
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
