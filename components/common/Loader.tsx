import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoaderProps {
    fullScreen?: boolean;
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    className?: string;
}

const Loader: React.FC<LoaderProps> = ({
    fullScreen = false,
    size = 'md',
    text = 'Loading…',
    className = ''
}) => {
    const sizeClasses = {
        sm: 'w-5 h-5',
        md: 'w-8 h-8',
        lg: 'w-12 h-12'
    };

    const containerClasses = fullScreen
        ? 'fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center'
        : `flex flex-col items-center justify-center p-8 ${className}`;

    return (
        <div className={containerClasses}>
            <Loader2 className={`${sizeClasses[size]} animate-spin text-primary mb-3`} />
            {text && <p className="text-contentSecondary text-sm font-medium animate-pulse">{text}</p>}
        </div>
    );
};

export default Loader;
