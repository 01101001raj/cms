import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { User, UserRole, PortalState } from '../types';
import { supabase } from '../services/supabaseClient';
import { menuItems } from '../constants';
import { safeStorage } from '../utils/storage';

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
    setPortal: () => { },
    login: async () => { },
    logout: () => { },
    isLoading: true,
});

const PORTAL_STORAGE_KEY = 'cms_portal_state';
const USER_CACHE_KEY = 'cms_user_cache';
const CACHE_VERSION = '1.0.2'; // Bumped to refresh permissions with new menu items
const MAX_LOADING_TIME = 3000; // 3 seconds max loading time

interface CachedUserData {
    version: string;
    user: User;
    portal: PortalState | null;
}

// Get cached user data from safeStorage
const getCachedUser = (): CachedUserData | null => {
    try {
        const cached = safeStorage.getItem(USER_CACHE_KEY);
        if (!cached) return null;
        const data = JSON.parse(cached);
        // Validate version
        if (data.version !== CACHE_VERSION) {
            console.log('[Auth] Cache version mismatch, clearing');
            safeStorage.removeItem(USER_CACHE_KEY);
            return null;
        }
        return data;
    } catch (e) {
        console.error('[Auth] Failed to read user cache:', e);
        return null;
    }
};

// Save user data to safeStorage cache
const setCachedUser = (user: User, portal: PortalState | null) => {
    try {
        const data: CachedUserData = {
            version: CACHE_VERSION,
            user,
            portal
        };
        safeStorage.setItem(USER_CACHE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('[Auth] Failed to cache user data:', e);
    }
};

// Clear user cache from safeStorage
const clearUserCache = () => {
    try {
        safeStorage.removeItem(USER_CACHE_KEY);
        safeStorage.removeItem(PORTAL_STORAGE_KEY);
    } catch (e) {
        console.error('[Auth] Failed to clear user cache:', e);
    }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // Read cache exactly ONCE
    const initialCache = useMemo(() => getCachedUser(), []);

    // Initialize state from cache for instant UI
    const [currentUser, setCurrentUser] = useState<User | null>(initialCache?.user || null);
    const [portal, setPortalState] = useState<PortalState | null>(initialCache?.portal || null);
    const [isLoading, setIsLoading] = useState(!initialCache);

    // Fetch user profile and determine portal from database
    const fetchUserProfile = useCallback(async (userId: string): Promise<{ userProfile: User; resolvedPortal: PortalState | null }> => {
        const { data: profile, error } = await supabase
            .from('users')
            .select('*, stores ( name )')
            .eq('id', userId)
            .single();

        if (error) throw error;

        // Validate store-level users have a store_id
        if ([UserRole.STORE_ADMIN, UserRole.ASM, UserRole.EXECUTIVE, UserRole.USER].includes(profile.role) && !profile.store_id) {
            throw new Error(`User with role '${profile.role}' is not associated with a store. Please contact an administrator.`);
        }

        // Build user profile
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

        // Determine portal state
        let resolvedPortal: PortalState | null = null;
        if (userProfile.role === UserRole.PLANT_ADMIN) {
            // For Plant Admins, check if they have a saved portal preference
            try {
                const savedPortal = safeStorage.getItem(PORTAL_STORAGE_KEY);
                if (savedPortal) {
                    resolvedPortal = JSON.parse(savedPortal);
                }
            } catch (e) {
                console.error('[Auth] Failed to parse saved portal:', e);
            }
        } else if (userProfile.storeId) {
            // For store users, lock to their store
            const storeName = profile.stores?.name;
            if (storeName) {
                resolvedPortal = { type: 'store', id: userProfile.storeId, name: storeName };
            } else {
                const { data: store } = await supabase.from('stores').select('name').eq('id', userProfile.storeId).single();
                resolvedPortal = { type: 'store', id: userProfile.storeId, name: store?.name || `Store ${userProfile.storeId}` };
            }
        }

        return { userProfile, resolvedPortal };
    }, []);

    // Main authentication effect
    useEffect(() => {
        if (!supabase) {
            console.error("[Auth] Supabase client is not initialized.");
            setIsLoading(false);
            return;
        }

        let mounted = true;
        let loadingTimeout: NodeJS.Timeout | null = null;

        // CRITICAL: Set timeout to force logout if loading takes too long
        if (isLoading) {
            console.log('[Auth] Starting loading timeout (3 seconds)');
            loadingTimeout = setTimeout(() => {
                if (mounted && isLoading) {
                    console.warn('[Auth] Loading timeout reached - forcing logout');
                    setCurrentUser(null);
                    setPortalState(null);
                    clearUserCache();
                    setIsLoading(false);
                    // Force sign out from Supabase
                    supabase.auth.signOut();
                }
            }, MAX_LOADING_TIME);
        }

        // Listen for auth state changes from Supabase
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] Event:', event, '| Has session:', !!session);

            if (!mounted) return;

            // Clear timeout if we get a response
            if (loadingTimeout) {
                clearTimeout(loadingTimeout);
                loadingTimeout = null;
            }

            if (session?.user) {
                // We have a session
                const cachedData = getCachedUser();

                // Use cache if it matches the session
                if (cachedData && cachedData.user.id === session.user.id) {
                    console.log('[Auth] Cache valid - using it');
                    setCurrentUser(cachedData.user);
                    setPortalState(cachedData.portal);
                    setIsLoading(false);
                    return;
                }

                // Fetch fresh profile
                try {
                    console.log('[Auth] Fetching fresh profile');
                    const { userProfile, resolvedPortal } = await fetchUserProfile(session.user.id);
                    if (mounted) {
                        setCurrentUser(userProfile);
                        setPortalState(resolvedPortal);
                        setCachedUser(userProfile, resolvedPortal);
                        setIsLoading(false);
                    }
                } catch (error) {
                    console.error('[Auth] Profile fetch failed:', error);
                    await supabase.auth.signOut();
                    setCurrentUser(null);
                    setPortalState(null);
                    clearUserCache();
                    setIsLoading(false);
                }
            } else {
                // No session
                console.log('[Auth] No session - logged out');
                setCurrentUser(null);
                setPortalState(null);
                clearUserCache();
                setIsLoading(false);
            }
        });

        // Handle visibility change - restore from cache immediately
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && mounted) {
                const cachedData = getCachedUser();
                if (cachedData) {
                    console.log('[Auth] App visible - restoring cache');
                    setCurrentUser(cachedData.user);
                    setPortalState(cachedData.portal);
                    setIsLoading(false);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Cleanup
        return () => {
            mounted = false;
            if (loadingTimeout) clearTimeout(loadingTimeout);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            subscription.unsubscribe();
        };
    }, [fetchUserProfile, isLoading]);

    // Login function
    const login = useCallback(async (email: string, pass: string) => {
        if (!supabase) throw new Error("Supabase is not connected.");

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password: pass
            });

            if (error) throw error;
            // onAuthStateChange will handle fetching the profile
        } catch (error) {
            setIsLoading(false);
            throw error;
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        if (!supabase) return;

        try {
            await supabase.auth.signOut();
            setCurrentUser(null);
            setPortalState(null);
            clearUserCache();
            setIsLoading(false);
        } catch (error) {
            console.error('[Auth] Logout error:', error);
            // Force clear even on error
            setCurrentUser(null);
            setPortalState(null);
            clearUserCache();
            setIsLoading(false);
        }
    }, []);

    // Set portal function (for Plant Admins switching portals)
    const setPortal = useCallback((newPortal: PortalState | null) => {
        setPortalState(newPortal);

        // Update cache with new portal
        if (currentUser) {
            setCachedUser(currentUser, newPortal);
        }

        // Persist portal preference to safeStorage
        try {
            if (newPortal) {
                safeStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(newPortal));
            } else {
                safeStorage.removeItem(PORTAL_STORAGE_KEY);
            }
        } catch (e) {
            console.error('[Auth] Failed to persist portal state:', e);
        }
    }, [currentUser]);

    // Memoize context value to prevent unnecessary re-renders
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
