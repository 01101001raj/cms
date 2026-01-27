
/**
 * SafeStorage: A wrapper around localStorage with in-memory caching.
 * 
 * Why?
 * 1. Performance: localStorage is synchronous and blocking. Reading it in render loops or frequently
 *    can cause frame drops. In-memory cache makes reads instant.
 * 2. Reliability: Wraps calls in try-catch to prevent crashes if storage is disabled/full.
 * 3. Type Safety: string input/output by default, but handles parsing internally if needed in wrappers.
 */
class SafeStorage {
    private cache: Map<string, string | null>;

    constructor() {
        this.cache = new Map();
    }

    /**
     * Get item from cache or storage
     */
    getItem(key: string): string | null {
        if (this.cache.has(key)) {
            return this.cache.get(key) || null;
        }

        try {
            const value = localStorage.getItem(key);
            this.cache.set(key, value);
            return value;
        } catch (e) {
            console.warn(`[SafeStorage] Failed to get item ${key}`, e);
            return null;
        }
    }

    /**
     * Set item in storage and cache
     */
    setItem(key: string, value: string): void {
        try {
            this.cache.set(key, value);
            localStorage.setItem(key, value);
        } catch (e) {
            console.warn(`[SafeStorage] Failed to set item ${key}`, e);
        }
    }

    /**
     * Remove item from storage and cache
     */
    removeItem(key: string): void {
        try {
            this.cache.delete(key);
            localStorage.removeItem(key);
        } catch (e) {
            console.warn(`[SafeStorage] Failed to remove item ${key}`, e);
        }
    }

    /**
     * Clear all items (specific to this app's keys if possible, but Clear clears all)
     * We will verify cache synchronization.
     */
    clear(): void {
        try {
            this.cache.clear();
            localStorage.clear();
        } catch (e) {
            console.warn('[SafeStorage] Failed to clear storage', e);
        }
    }
}

export const safeStorage = new SafeStorage();
