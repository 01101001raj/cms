import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companyService, CompanyCreate } from '../../services/api/companyService';
import { CompanyDetails } from '../../types'; // Assuming CompanyDetails matches Company roughly

export const useCompany = () => {
    return useQuery({
        queryKey: ['company'],
        queryFn: () => companyService.getPrimaryCompany(),
        staleTime: 5 * 60 * 1000,
    });
};

export const useCreateCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (details: CompanyCreate) => companyService.createCompany(details),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
        },
    });
};

export const useUpdateCompany = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, details }: { id: string, details: CompanyCreate }) =>
            companyService.updateCompany(id, details),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['company'] });
        },
    });
};
