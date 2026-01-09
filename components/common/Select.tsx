import React, { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(({ label, id, error, children, className = '', ...props }, ref) => {
  return (
    <div className="w-full group">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-contentSecondary mb-1.5 transition-colors group-focus-within:text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          ref={ref}
          className={`
            w-full px-4 py-2.5 border rounded-xl appearance-none
            focus:outline-none focus:ring-4 focus:ring-primary/10 
            transition-all duration-200 
            bg-white text-sm text-content font-medium
            shadow-sm cursor-pointer
            bg-no-repeat bg-[right_1rem_center] bg-[length:1.25em_1.25em]
            ${error
              ? 'border-danger focus:border-danger focus:ring-danger/10'
              : 'border-border hover:border-contentSecondary/50 focus:border-primary'
            }
            ${className}
          `}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`
          }}
          {...props}
        >
          {children}
        </select>
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

export default Select;