import { Button as AriaButton, type ButtonProps as AriaButtonProps } from 'react-aria-components';
import { cn } from '../../lib/utils';

const sizeStyles = {
  sm: 'h-7 w-7',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
} as const;

export interface IconButtonProps extends AriaButtonProps {
  size?: keyof typeof sizeStyles;
  'aria-label': string;
}

export function IconButton({ size = 'md', className, ...props }: IconButtonProps) {
  return (
    <AriaButton
      className={cn(
        'inline-flex items-center justify-center rounded-md text-text-secondary transition-colors',
        'hover:bg-bg-secondary hover:text-text-primary',
        'active:bg-bg-tertiary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-focus',
        'disabled:opacity-50 disabled:pointer-events-none',
        sizeStyles[size],
        className
      )}
      {...props}
    />
  );
}
