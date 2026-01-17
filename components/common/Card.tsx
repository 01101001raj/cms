import React, { ReactNode } from 'react';

// FIX: Extend React.HTMLAttributes<HTMLDivElement> to allow passing standard div props like onClick.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, onClick, ...props }) => {
  return (
    <div
      className={`
            bg-card rounded-xl shadow-card border border-border
            transition-all duration-300 ease-out
            ${onClick ? 'cursor-pointer hover:shadow-card-hover hover:-translate-y-1' : ''}
            ${noPadding ? '' : 'p-6'} 
            ${className}
        `}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
