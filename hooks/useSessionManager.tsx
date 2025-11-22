import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useNavigate } from 'react-router-dom';

/**
 * Session Manager Hook
 * Handles automatic logout on inactivity and tab visibility changes
 */

// Session timeout: 30 minutes of inactivity
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

// Warning before logout: 2 minutes
const WARNING_TIME = 2 * 60 * 1000; // 2 minutes before logout

export const useSessionManager = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const warningRef = useRef<NodeJS.Timeout | null>(null);

    // Reset the inactivity timer
    const resetTimer = useCallback(() => {
        // Clear existing timers
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        if (warningRef.current) {
            clearTimeout(warningRef.current);
        }

        // Only set timers if user is logged in
        if (!currentUser) return;

        // Set warning timer (2 minutes before logout)
        warningRef.current = setTimeout(() => {
            console.log('Session will expire in 2 minutes due to inactivity');
            // You can add a toast notification here if you want
        }, SESSION_TIMEOUT - WARNING_TIME);

        // Set logout timer (30 minutes)
        timeoutRef.current = setTimeout(() => {
            console.log('Session expired due to inactivity');
            handleLogout();
        }, SESSION_TIMEOUT);
    }, [currentUser]);

    // Handle logout
    const handleLogout = useCallback(async () => {
        await logout();
        navigate('/login', { replace: true });
    }, [logout, navigate]);

    // Track user activity
    useEffect(() => {
        if (!currentUser) return;

        // Events that indicate user activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

        // Reset timer on any user activity
        const handleActivity = () => {
            resetTimer();
        };

        // Add event listeners
        events.forEach(event => {
            window.addEventListener(event, handleActivity);
        });

        // Start the initial timer
        resetTimer();

        // Handle page visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // User switched away from the tab
                console.log('Tab hidden - timer paused');
            } else {
                // User came back to the tab
                console.log('Tab visible - timer reset');
                resetTimer();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (warningRef.current) clearTimeout(warningRef.current);
        };
    }, [currentUser, resetTimer]);

    return { resetTimer };
};
