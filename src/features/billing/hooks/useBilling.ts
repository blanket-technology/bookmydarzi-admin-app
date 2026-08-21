import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { billingService } from '@/services/billingService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { BillingSettingsUpdateRequest } from '@/types/billing';

export const useBillingSettings = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.BILLING_SETTINGS,
    queryFn: () => billingService.get(),
    enabled,
  });

export const useUpdateBillingSettingsMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BillingSettingsUpdateRequest) => billingService.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BILLING_SETTINGS });
      toast.success('Billing settings updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
