import React, { createContext, useContext, ReactNode } from 'react';
import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

// Backward compatibility interface
interface ToastContextType {
    toasts: any[]; // Deprecated, sonner manages state internally
    showToast: (message: string, type?: ToastType, duration?: number) => void;
    showSuccess: (message: string) => void;
    showError: (message: string) => void;
    showWarning: (message: string) => void;
    showInfo: (message: string) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Sonner manages its own state, so we don't track toasts here

    const showToast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
        const options = { duration };
        switch (type) {
            case 'success':
                toast.success(message, options);
                break;
            case 'error':
                toast.error(message, options);
                break;
            case 'warning':
                toast.warning(message, options);
                break;
            case 'info':
            default:
                toast.info(message, options);
                break;
        }
    };

    const showSuccess = (message: string) => toast.success(message);
    const showError = (message: string) => toast.error(message, { duration: 7000 });
    const showWarning = (message: string) => toast.warning(message);
    const showInfo = (message: string) => toast.info(message);

    // Sonner handles removal internally or via toast.dismiss(id)
    // For backward compatibility, we provide a dummy or simplistic implementation
    const removeToast = (id: string) => {
        toast.dismiss(id);
    };

    return (
        <ToastContext.Provider value={{
            toasts: [], // Deprecated
            showToast,
            showSuccess,
            showError,
            showWarning,
            showInfo,
            removeToast
        }}>
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
