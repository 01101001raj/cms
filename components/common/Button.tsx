import React from 'react';
import { Button as ShadcnButton, ButtonProps } from '../ui/button';

// Wrapper for backward compatibility
// The new Button handles 'isLoading' and legacy variants 'primary'/'danger' internally via cva
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>((props, ref) => {
  return <ShadcnButton ref={ref} {...props} />;
});
Button.displayName = "Button";

export default Button;