import { useCallback } from 'react';

/**
 * Simplified Session Manager Hook
 *
 * Session behavior with localStorage:
 * - Session persists indefinitely across:
 *   - App switches (minimizing browser)
 *   - Tab switches
 *   - Browser restarts
 *   - Device reboots
 * - Supabase automatically handles token refresh in the background
 * - Session ONLY clears when:
 *   1. User explicitly clicks logout
 *   2. Session becomes invalid (manual deletion in browser or expired token)
 * - NO timeout-based logout
 * - NO activity tracking
 * - NO beforeunload warnings
 * - NO loading screens when switching apps or tabs
 * - NO automatic logout on tab close
 */

export const useSessionManager = () => {
    // This hook is now minimal - all session logic is handled by:
    // 1. Supabase's built-in auto-refresh (configured in supabaseClient.ts)
    // 2. localStorage persistence (configured in useAuth.tsx)
    // 3. Session cleared ONLY on explicit logout

    const resetTimer = useCallback(() => {
        // No-op - no timer needed
        // Session persists indefinitely until explicit logout
    }, []);

    return { resetTimer };
};
