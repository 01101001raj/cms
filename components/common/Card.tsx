import React, { ReactNode } from 'react';
import { Card as ShadcnCard } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

const Card: React.FC<CardProps> = ({ children, className = '', noPadding = false, onClick, ...props }) => {
  return (
    <ShadcnCard
      className={cn(
        "transition-all duration-300 ease-out",
        !noPadding && "p-6",
        onClick && "cursor-pointer hover:shadow-lg hover:-translate-y-1",
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </ShadcnCard>
  );
};

export default Card;
