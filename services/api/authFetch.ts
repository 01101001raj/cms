import { supabase } from '../supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

/**
 * Get the current session token from Supabase
 */
async function getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Create headers with auth token
 */
async function getAuthHeaders(): Promise<HeadersInit> {
    const token = await getAuthToken();
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
}

/**
 * Authenticated fetch wrapper
 */
export async function authFetch(
    endpoint: string,
    options: RequestInit = {}
): Promise<Response> {
    const headers = await getAuthHeaders();

    return fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });
}

/**
 * Authenticated GET request
 */
export async function authGet<T>(endpoint: string): Promise<T> {
    const response = await authFetch(endpoint);

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

/**
 * Authenticated POST request
 */
export async function authPost<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await authFetch(endpoint, {
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

/**
 * Authenticated PUT request
 */
export async function authPut<T>(endpoint: string, data?: unknown): Promise<T> {
    const response = await authFetch(endpoint, {
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }

    return response.json();
}

/**
 * Authenticated DELETE request
 */
export async function authDelete(endpoint: string): Promise<void> {
    const response = await authFetch(endpoint, {
        method: 'DELETE',
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }));
        throw new Error(error.detail || 'Request failed');
    }
}
