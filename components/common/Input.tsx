import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconClick?: () => void;
}

const Input: React.FC<InputProps> = ({ label, id, error, icon, rightIcon, onRightIconClick, ...props }) => {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-contentSecondary mb-1">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-contentSecondary">
            {icon}
          </div>
        )}
        <input
          id={id}
          className={`w-full py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition bg-slate-50 text-sm text-content ${icon ? 'pl-10' : 'px-3'} ${rightIcon ? 'pr-10' : ''} ${error ? 'border-red-500 focus:ring-red-500/50' : 'border-border focus:border-primary focus:bg-white'}`}
          {...props}
        />
        {rightIcon && (
          <button
            type="button"
            onClick={onRightIconClick}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-contentSecondary hover:text-content focus:outline-none"
            aria-label="Toggle input visibility"
          >
            {rightIcon}
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Input;