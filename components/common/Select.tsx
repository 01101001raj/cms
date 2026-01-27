import React, { forwardRef } from 'react';
import ChevronDown from 'lucide-react/dist/esm/icons/chevron-down';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
  containerClassName?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  id,
  error,
  children,
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
      <div className="relative">
        <select
          id={id}
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "pr-8", // Extra padding for the chevron
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-muted-foreground">
          <ChevronDown className="h-4 w-4 opacity-50" />
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

export default Select;