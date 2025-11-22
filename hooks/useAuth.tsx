import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, PortalState } from '../types';
import { supabase } from '../services/supabaseClient';
import { menuItems } from '../constants';

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  portal: PortalState | null;
  setPortal: (portal: PortalState | null) => void;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    currentUser: null,
    userRole: null,
    portal: null,
    setPortal: () => {},
    login: async () => {},
    logout: () => {},
    isLoading: true,
});

const PORTAL_STORAGE_KEY = 'distributorAppPortal';
const USER_PROFILE_STORAGE_KEY = 'distributorAppUserProfile';

// Synchronously load initial state from storage to prevent UI flicker on refresh.
const getInitialUser = (): User | null => {
    try {
        const item = sessionStorage.getItem(USER_PROFILE_STORAGE_KEY);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Failed to parse user from sessionStorage", error);
        sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
        return null;
    }
};

const getInitialPortal = (): PortalState | null => {
    try {
        const item = localStorage.getItem(PORTAL_STORAGE_KEY);
        return item ? JSON.parse(item) : null;
    } catch (error) {
        console.error("Failed to parse portal from localStorage", error);
        localStorage.removeItem(PORTAL_STORAGE_KEY);
        return null;
    }
};


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Initialize state from storage for an instant UI response on page loads.
    const [currentUser, setCurrentUser] = useState<User | null>(getInitialUser);
    const [portal, setPortalState] = useState<PortalState | null>(getInitialPortal);
    // isLoading is now for the initial session *verification*, not the initial data load.
    const [isLoading, setIsLoading] = useState(true);

    const clearSession = useCallback(() => {
        setCurrentUser(null);
        setPortalState(null);
        try {
            sessionStorage.removeItem(USER_PROFILE_STORAGE_KEY);
            localStorage.removeItem(PORTAL_STORAGE_KEY);
        } catch (e) {
            console.error("Failed to clear session data from storage", e);
        }
    }, []);

    const persistUserAndPortal = useCallback((user: User, resolvedPortal: PortalState | null) => {
        setCurrentUser(user);
        setPortalState(resolvedPortal);
        try {
            sessionStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(user));
            if (resolvedPortal) {
                localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(resolvedPortal));
            } else {
                localStorage.removeItem(PORTAL_STORAGE_KEY);
            }
        } catch (e) {
            console.error("Failed to persist session data to storage", e);
        }
    }, []);
    
    // Fetch user profile and permissions from database
    const fetchUserProfile = useCallback(async (userId: string) => {
        const { data: profile, error } = await supabase
            .from('users')
            .select('*, stores ( name )')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Add a hard check for misconfigured store-level users
        if ([UserRole.STORE_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.USER].includes(profile.role) && !profile.store_id) {
            throw new Error(`User with role '${profile.role}' is not associated with a store. Please contact an administrator.`);
        }

        // For Plant Admin, ALWAYS generate fresh permissions from menuItems
        // For other roles, use database permissions
        const userProfile: User = {
            id: profile.id,
            username: profile.username,
            role: profile.role,
            storeId: profile.store_id,
            permissions: profile.role === UserRole.PLANT_ADMIN
                ? menuItems.map(item => item.path)
                : profile.permissions,
            asmId: profile.asm_id
        };

        let resolvedPortal: PortalState | null = null;
        if (userProfile.role === UserRole.PLANT_ADMIN) {
            // For Plant Admins, respect the portal choice they previously saved.
            resolvedPortal = getInitialPortal();
        } else if (userProfile.storeId) {
            // For store-based users, lock them to their assigned store portal.
            const storeName = profile.stores?.name;
            if (storeName) {
                resolvedPortal = { type: 'store', id: userProfile.storeId, name: storeName };
            } else {
                // Fallback fetch if the initial join failed for some reason
                const { data: store } = await supabase.from('stores').select('name').eq('id', userProfile.storeId).single();
                resolvedPortal = { type: 'store', id: userProfile.storeId, name: store?.name || `Store ${userProfile.storeId}` };
            }
        }

        return { userProfile, resolvedPortal };
    }, []);

    useEffect(() => {
        if (!supabase) {
            setIsLoading(false);
            return;
        }

        // FIX: Cast `supabase.auth` to `any` to access `onAuthStateChange`.
        const { data: authListener } = (supabase.auth as any).onAuthStateChange(async (event, session) => {
            if (!session) {
                if (currentUser) clearSession(); // Clear state if a session ends
                setIsLoading(false);
                return;
            }

            // REMOVED Fast Path - Always fetch fresh permissions from database
            // This ensures Plant Admin always gets the latest menu items
            try {
                const { userProfile, resolvedPortal } = await fetchUserProfile(session.user.id);
                persistUserAndPortal(userProfile, resolvedPortal);
            } catch (error) {
                console.error("Critical: Failed to fetch user profile for an active session. Logging out.", error);
                // If we have a session but absolutely cannot get a profile, something is wrong.
                // Logging out is the safest way to handle this inconsistent state.
                // FIX: Cast `supabase.auth` to `any` to access `signOut`.
                await (supabase.auth as any).signOut();
                clearSession();
            } finally {
                setIsLoading(false);
            }
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [fetchUserProfile, persistUserAndPortal, clearSession]);


    const login = useCallback(async (email: string, pass: string) => {
        if (!supabase) throw new Error("Supabase is not connected.");
        // Clear any previous session data before attempting a new login.
        clearSession();
        // FIX: Cast `supabase.auth` to `any` to access `signInWithPassword`.
        const { error } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
        if (error) throw error;
        // The onAuthStateChange listener will handle fetching the profile and setting the state.
    }, [clearSession]);

    const logout = useCallback(async () => {
        if (!supabase) return;
        // FIX: Cast `supabase.auth` to `any` to access `signOut`.
        await (supabase.auth as any).signOut();
        // The onAuthStateChange listener will automatically call clearSession.
    }, []);

    const setPortal = useCallback((newPortal: PortalState | null) => {
        setPortalState(newPortal);
        if (newPortal) {
            localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(newPortal));
        } else {
            localStorage.removeItem(PORTAL_STORAGE_KEY);
        }
    }, []);

    const value = useMemo(() => ({
        currentUser,
        userRole: currentUser?.role || null,
        portal,
        setPortal,
        login,
        logout,
        isLoading,
    }), [currentUser, portal, isLoading, setPortal, login, logout]);

    return (
        <AuthContext.Provider value={value}>
          {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
