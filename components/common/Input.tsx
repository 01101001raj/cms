import React, { forwardRef } from 'react';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
  containerClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  id,
  error,
  icon,
  rightIcon,
  onRightIconClick,
  className = '',
  containerClassName = '',
  ...props
}, ref) => {
  return (
    <div className={cn("w-full space-y-1.5 group", containerClassName)}>
      {label && (
        <Label
          htmlFor={id}
          className={cn(
            "text-sm font-semibold text-muted-foreground transition-colors group-focus-within:text-primary",
            error && "text-destructive"
          )}
        >
          {label}
        </Label>
      )}
      <div className="relative text-foreground">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <ShadcnInput
          id={id}
          ref={ref}
          className={cn(
            "h-10 transition-all duration-200",
            icon ? 'pl-10' : 'px-4',
            rightIcon ? 'pr-11' : '',
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
            aria-label="Toggle input visibility"
            tabIndex={-1}
          >
            {rightIcon}
          </button>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;