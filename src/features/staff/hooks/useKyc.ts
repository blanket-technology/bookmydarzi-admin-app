import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { kycService } from '@/services/kycService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { KycDocumentType } from '@/types/kyc';

export const useMyKycStatus = (role: 'tailor' | 'employee', enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_KYC(role),
    queryFn: () => kycService.getStatus(role),
    enabled,
  });

export const useUploadMyKycMutation = (role: 'tailor' | 'employee') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentType,
      file,
    }: {
      documentType: KycDocumentType;
      file: { uri: string; fileName?: string; mimeType?: string };
    }) => kycService.upload(role, documentType, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_KYC(role) });
      toast.success('Document uploaded');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteMyKycMutation = (role: 'tailor' | 'employee') => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentType: KycDocumentType) => kycService.delete(role, documentType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MY_KYC(role) });
      toast.success('Document removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
