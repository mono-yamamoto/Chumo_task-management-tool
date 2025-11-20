import * as React from 'react';
import { Button as MUIButton, ButtonProps as MUIButtonProps } from '@mui/material';

export interface ButtonProps extends Omit<MUIButtonProps, 'variant' | 'size' | 'color'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'default', size = 'default', ...props }, ref) => {

    let muiVariant: 'contained' | 'outlined' | 'text';
    if (variant === 'default' || variant === 'destructive' || variant === 'secondary') {
      muiVariant = 'contained';
    } else if (variant === 'outline') {
      muiVariant = 'outlined';
    } else {
      muiVariant = 'text';
    }

    let muiColor: 'error' | 'secondary' | 'primary';
    if (variant === 'destructive') {
      muiColor = 'error';
    } else if (variant === 'secondary') {
      muiColor = 'secondary';
    } else {
      muiColor = 'primary';
    }

    let muiSize: 'small' | 'medium' | 'large';
    if (size === 'sm') {
      muiSize = 'small';
    } else if (size === 'lg') {
      muiSize = 'large';
    } else {
      muiSize = 'medium';
    }

    return (
      <MUIButton
        ref={ref}
        variant={muiVariant}
        color={muiColor}
        size={muiSize}

        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
