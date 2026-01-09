import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, id, error, icon, rightIcon, onRightIconClick, className = '', ...props }, ref) => {
  return (
    <div className="w-full group">
      {label && (
        <label htmlFor={id} className="block text-sm font-semibold text-contentSecondary mb-1.5 transition-colors group-focus-within:text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-contentTertiary group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={`
            w-full py-2.5 border rounded-xl 
            focus:outline-none focus:ring-4 focus:ring-primary/10 
            transition-all duration-200 
            bg-white text-sm text-content font-medium
            placeholder:text-contentTertiary
            shadow-sm
            ${icon ? 'pl-10' : 'px-4'} 
            ${rightIcon ? 'pr-11' : ''} 
            ${error
              ? 'border-danger focus:border-danger focus:ring-danger/10'
              : 'border-border hover:border-contentSecondary/50 focus:border-primary'
            }
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-contentTertiary hover:text-contentSecondary focus:outline-none transition-colors"
            aria-label="Toggle input visibility"
          >
            {rightIcon}
          </button>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger animate-in fade-in slide-in-from-top-1">{error}</p>}
    </div>
  );
});
Input.displayName = 'Input';

export default Input;