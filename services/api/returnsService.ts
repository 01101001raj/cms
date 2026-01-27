import { authGet, authPost, authPut } from './authFetch';

export interface ReturnItem {
    id?: string;
    skuId: string;
    quantity: number;
    reason: string;
    sku?: {
        name: string;
        price: number;
    };
}

export interface ReturnRequest {
    id: string;
    order_id: string;
    distributor_id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CREDITED';
    estimated_credit: number;
    actual_credit?: number;
    remarks?: string;
    created_at: string;
    created_by: string;
    approved_at?: string;
    approved_by?: string;
    approval_remarks?: string;
    distributors?: {
        name: string;
    };
    orders?: {
        id: string;
    };
    return_items?: ReturnItem[];
}

export interface ReturnCreateData {
    orderId: string;
    distributorId: string;
    items: {
        skuId: string;
        quantity: number;
        reason: string;
    }[];
    remarks?: string;
    username: string;
}

export const returnsService = {
    /**
     * Get all returns with optional filtering
     */
    getReturns: async (distributorId?: string, status?: string) => {
        let url = '/returns';
        const params = new URLSearchParams();
        if (distributorId) params.append('distributor_id', distributorId);
        if (status) params.append('status', status);

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        return authGet<ReturnRequest[]>(url);
    },

    /**
     * Create a new return request
     */
    createReturn: async (data: ReturnCreateData) => {
        return authPost<ReturnRequest>('/returns', data);
    },

    /**
     * Approve a return
     */
    approveReturn: async (returnId: string, creditAmount: number, remarks: string, username: string) => {
        return authPut<{ message: string; newBalance: number }>(`/returns/${returnId}/approve`, {
            creditAmount,
            remarks,
            username
        });
    },

    /**
     * Reject a return
     */
    rejectReturn: async (returnId: string, remarks: string, username: string) => {
        const params = new URLSearchParams({
            remarks,
            username
        });
        return authPut<{ message: string }>(`/returns/${returnId}/reject?${params.toString()}`);
    }
};
