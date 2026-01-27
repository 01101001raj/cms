import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';

const DEFAULT_TIMEOUT_MINUTES = 30;
const WARNING_BEFORE_MINUTES = 5;

interface UseSessionTimeoutOptions {
    /** Timeout in minutes (default: 30) */
    timeoutMinutes?: number;
    /** Minutes before timeout to show warning (default: 5) */
    warningMinutes?: number;
    /** Callback when session is about to expire */
    onWarning?: (remainingSeconds: number) => void;
    /** Callback when session expires */
    onExpire?: () => void;
}

/**
 * Hook to handle session timeout with automatic logout
 */
export function useSessionTimeout({
    timeoutMinutes = DEFAULT_TIMEOUT_MINUTES,
    warningMinutes = WARNING_BEFORE_MINUTES,
    onWarning,
    onExpire,
}: UseSessionTimeoutOptions = {}) {
    const { currentUser: user, logout } = useAuth();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);
    const lastActivityRef = useRef<number>(Date.now());

    const timeoutMs = timeoutMinutes * 60 * 1000;
    const warningMs = (timeoutMinutes - warningMinutes) * 60 * 1000;

    /**
     * Reset the timeout timers
     */
    const resetTimeout = useCallback(() => {
        lastActivityRef.current = Date.now();

        // Clear existing timers
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (warningRef.current) clearTimeout(warningRef.current);

        if (!user) return;

        // Set warning timer
        warningRef.current = setTimeout(() => {
            const remainingSeconds = (timeoutMinutes - warningMinutes) * 60;
            onWarning?.(remainingSeconds);
        }, warningMs);

        // Set expiration timer
        timeoutRef.current = setTimeout(() => {
            onExpire?.();
            logout();
        }, timeoutMs);
    }, [user, timeoutMs, warningMs, timeoutMinutes, warningMinutes, onWarning, onExpire, logout]);

    /**
     * Handle user activity
     */
    const handleActivity = useCallback(() => {
        resetTimeout();
    }, [resetTimeout]);

    // Set up activity listeners
    useEffect(() => {
        if (!user) return;

        const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

        // Throttle activity detection to avoid excessive resets
        let throttleTimer: NodeJS.Timeout | null = null;
        const throttledHandler = () => {
            if (throttleTimer) return;
            throttleTimer = setTimeout(() => {
                handleActivity();
                throttleTimer = null;
            }, 1000); // Only reset every second at most
        };

        events.forEach(event => {
            window.addEventListener(event, throttledHandler, { passive: true });
        });

        // Initial timeout setup
        resetTimeout();

        return () => {
            events.forEach(event => {
                window.removeEventListener(event, throttledHandler);
            });
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningRef.current) clearTimeout(warningRef.current);
            if (throttleTimer) clearTimeout(throttleTimer);
        };
    }, [user, handleActivity, resetTimeout]);

    /**
     * Get remaining session time in seconds
     */
    const getRemainingTime = useCallback(() => {
        const elapsed = Date.now() - lastActivityRef.current;
        return Math.max(0, Math.floor((timeoutMs - elapsed) / 1000));
    }, [timeoutMs]);

    /**
     * Extend the session (reset timer)
     */
    const extendSession = useCallback(() => {
        resetTimeout();
    }, [resetTimeout]);

    return {
        resetTimeout,
        extendSession,
        getRemainingTime,
    };
}

export default useSessionTimeout;
