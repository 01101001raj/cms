const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    entity_type: string;
    entity_id: string;
    user_id?: string;
    username?: string;
    old_value?: string;
    new_value?: string;
    details?: string;
}

export const auditService = {
    async getAuditLogs(filters?: {
        entity_type?: string;
        entity_id?: string;
        action?: string;
        start_date?: string;
        end_date?: string;
        limit?: number;
    }): Promise<AuditLog[]> {
        const params = new URLSearchParams();
        if (filters?.entity_type) params.append('entity_type', filters.entity_type);
        if (filters?.entity_id) params.append('entity_id', filters.entity_id);
        if (filters?.action) params.append('action', filters.action);
        if (filters?.start_date) params.append('start_date', filters.start_date);
        if (filters?.end_date) params.append('end_date', filters.end_date);
        if (filters?.limit) params.append('limit', filters.limit.toString());

        const response = await fetch(`${API_URL}/audit?${params.toString()}`);
        if (!response.ok) {
            throw new Error('Failed to fetch audit logs');
        }
        return response.json();
    },

    async getEntityHistory(entityType: string, entityId: string): Promise<AuditLog[]> {
        const response = await fetch(`${API_URL}/audit/entity/${entityType}/${entityId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch entity history');
        }
        return response.json();
    }
};
