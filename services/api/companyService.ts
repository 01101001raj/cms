import { apiClient } from '../apiClient';

export interface Company {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    logoUrl?: string;
}

export interface CompanyCreate {
    name: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    phone: string;
    email: string;
    gstin: string;
    pan: string;
    bankName?: string;
    accountNumber?: string;
    ifscCode?: string;
    logoUrl?: string;
}

export const companyService = {
    /**
     * Get all companies
     */
    async getCompanies(): Promise<Company[]> {
        const response = await apiClient.get('/companies');
        return response.data;
    },

    /**
     * Get primary company (for invoices and documents)
     */
    async getPrimaryCompany(): Promise<Company> {
        const response = await apiClient.get('/companies/primary');
        return response.data;
    },

    /**
     * Get company by ID
     */
    async getCompanyById(id: string): Promise<Company> {
        const response = await apiClient.get(`/companies/${id}`);
        return response.data;
    },

    /**
     * Create a new company
     */
    async createCompany(company: CompanyCreate): Promise<Company> {
        const response = await apiClient.post('/companies', company);
        return response.data;
    },

    /**
     * Update company
     */
    async updateCompany(id: string, company: CompanyCreate): Promise<Company> {
        const response = await apiClient.put(`/companies/${id}`, company);
        return response.data;
    },

    /**
     * Delete company
     */
    async deleteCompany(id: string): Promise<void> {
        await apiClient.delete(`/companies/${id}`);
    },
};
