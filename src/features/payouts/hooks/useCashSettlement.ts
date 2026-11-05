import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cashSettlementService } from '@/services/cashSettlementService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { CashSettlementSubmitRequest } from '@/types/cashSettlement';

// Employee self-service
export const useMyCashBalance = (enabled = true) =>
  useQuery({
    queryKey: ['my-cash-balance'],
    queryFn: cashSettlementService.myBalance,
    enabled,
  });

export const useMyCashLedger = (enabled = true) =>
  useQuery({
    queryKey: ['my-cash-ledger'],
    queryFn: cashSettlementService.myLedger,
    enabled,
  });

export const useMyCashSettlements = (enabled = true) =>
  useQuery({
    queryKey: ['my-cash-settlements'],
    queryFn: cashSettlementService.mySettlements,
    enabled,
  });

export const useSubmitCashSettlementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CashSettlementSubmitRequest) => cashSettlementService.submitSettlement(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-cash-balance'] });
      queryClient.invalidateQueries({ queryKey: ['my-cash-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['my-cash-settlements'] });
      toast.success('Settlement submitted for review');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUploadCashSettlementProofMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      settlementId,
      file,
    }: {
      settlementId: string;
      file: { uri: string; fileName?: string; mimeType?: string };
    }) => cashSettlementService.uploadSettlementProof(settlementId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-cash-settlements'] });
      toast.success('Proof uploaded');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// Admin
export const useAdminCashBalances = (enabled = true) =>
  useQuery({
    queryKey: ['admin-cash-balances'],
    queryFn: cashSettlementService.adminBalances,
    enabled,
  });

export const useAdminCashSettlements = (status?: string, enabled = true) =>
  useQuery({
    queryKey: ['admin-cash-settlements', status ?? 'all'],
    queryFn: () => cashSettlementService.adminListSettlements(status),
    enabled,
  });

export const useConfirmCashSettlementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId, note }: { settlementId: string; note?: string }) =>
      cashSettlementService.adminConfirmSettlement(settlementId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cash-settlements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-cash-balances'] });
      toast.success('Settlement confirmed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useRejectCashSettlementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId, reason }: { settlementId: string; reason: string }) =>
      cashSettlementService.adminRejectSettlement(settlementId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-cash-settlements'] });
      toast.success('Settlement rejected');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCashCap = (enabled = true) =>
  useQuery({
    queryKey: ['cash-cap'],
    queryFn: cashSettlementService.getCashCap,
    enabled,
  });

export const useUpdateCashCapMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cap: number) => cashSettlementService.updateCashCap(cap),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cash-cap'] });
      toast.success('Cash cap updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
