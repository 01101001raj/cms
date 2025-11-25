const API_URL = import.meta.env.VITE_API_URL || 'https://backend-o2hwfjh2k-01101001rajs-projects.vercel.app/api/v1';

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
        const response = await fetch(`${API_URL}/companies`);
        if (!response.ok) throw new Error('Failed to fetch companies');
        return response.json();
    },

    /**
     * Get primary company (for invoices and documents)
     */
    async getPrimaryCompany(): Promise<Company> {
        const response = await fetch(`${API_URL}/companies/primary`);
        if (!response.ok) throw new Error('Failed to fetch primary company');
        return response.json();
    },

    /**
     * Get company by ID
     */
    async getCompanyById(id: string): Promise<Company> {
        const response = await fetch(`${API_URL}/companies/${id}`);
        if (!response.ok) throw new Error('Failed to fetch company');
        return response.json();
    },

    /**
     * Create a new company
     */
    async createCompany(company: CompanyCreate): Promise<Company> {
        const response = await fetch(`${API_URL}/companies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(company),
        });
        if (!response.ok) throw new Error('Failed to create company');
        return response.json();
    },

    /**
     * Update company
     */
    async updateCompany(id: string, company: CompanyCreate): Promise<Company> {
        const response = await fetch(`${API_URL}/companies/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(company),
        });
        if (!response.ok) throw new Error('Failed to update company');
        return response.json();
    },

    /**
     * Delete company
     */
    async deleteCompany(id: string): Promise<void> {
        const response = await fetch(`${API_URL}/companies/${id}`, {
            method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete company');
    },
};
