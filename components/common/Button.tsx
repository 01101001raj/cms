import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', isLoading = false, ...props }) => {
  const { className, ...restProps } = props;

  const baseClasses = 'rounded-lg font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 flex items-center justify-center gap-2 transform hover:-translate-y-px active:translate-y-0';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primaryHover focus:ring-primary/50',
    secondary: 'bg-card text-content border border-border hover:bg-slate-50 focus:ring-primary/50',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/50',
  };

  const disabledClasses = 'disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none';

  const combinedClassName = [
    baseClasses,
    sizeClasses[size],
    variantClasses[variant],
    disabledClasses,
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={combinedClassName}
      disabled={isLoading || props.disabled}
      {...restProps}
    >
      {isLoading && (
        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;