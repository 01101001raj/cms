import React, { ReactNode } from 'react';

// FIX: Extend React.HTMLAttributes<HTMLDivElement> to allow passing standard div props like onClick.
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', ...props }) => {
  return (
    <div className={`bg-card shadow-md rounded-xl p-6 border border-border ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
