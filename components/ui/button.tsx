import * as React from "react";
import { Button as MUIButton, ButtonProps as MUIButtonProps } from "@mui/material";

export interface ButtonProps extends Omit<MUIButtonProps, "variant" | "size" | "color"> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "default", size = "default", ...props }, ref) => {
    const muiVariant = variant === "default" ? "contained" : 
                      variant === "destructive" ? "contained" :
                      variant === "outline" ? "outlined" :
                      variant === "secondary" ? "contained" :
                      "text";
    
    const muiColor = variant === "destructive" ? "error" :
                     variant === "secondary" ? "secondary" :
                     "primary";
    
    const muiSize = size === "sm" ? "small" :
                   size === "lg" ? "large" :
                   "medium";

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
Button.displayName = "Button";

export { Button };

