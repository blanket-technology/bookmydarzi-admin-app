import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { tailorService } from '@/services/tailorService';
import { toast } from '@/store/toastStore';
import type { TailorSelfProfileUpdateRequest, UpdateTailorRequest } from '@/types/tailors';
import { getMutationError } from '@/utils/errors';

export const useMyTailorProfile = (enabled = true) =>
  useQuery({
    queryKey: ['tailor', 'me'],
    queryFn: () => tailorService.getMyProfile(),
    enabled,
  });

export const useUpdateMyTailorProfileMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: TailorSelfProfileUpdateRequest) => tailorService.updateMyProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor', 'me'] });
      toast.success('Profile updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// Real per-order commission ledger - replaces the old client-side derived
// "sum of my completed orders" approximation (useMyEarningsSummary).
export const useMyPayouts = (
  params: { page?: number; limit?: number; status?: 'pending' | 'paid' },
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_PAYOUTS('tailor', params as Record<string, unknown>),
    queryFn: () => tailorService.getMyPayouts(params),
    enabled,
  });

export const useMyPayoutSummary = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_PAYOUT_SUMMARY('tailor'),
    queryFn: () => tailorService.getMyPayoutSummary(),
    enabled,
  });

export const useTailors = (params?: { search?: string }, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.TAILORS(params),
    queryFn: () => tailorService.getTailors(params),
    enabled,
  });

// Server-side paginated counterpart to useTailors - that hook fetches the
// entire tailor roster on every call, fine while the team was small but not
// as it grows. Prefer this for any screen with a page control.
export const useTailorsPaginated = (
  params: { search?: string; page: number; limit: number },
  enabled = true,
) =>
  useQuery({
    queryKey: QUERY_KEYS.TAILORS(params as unknown as Record<string, unknown>),
    queryFn: () => tailorService.getTailorsPaginated(params),
    enabled,
    placeholderData: (prev) => prev,
  });

export const useTailorsForEmployee = (enabled = true) =>
  useQuery({
    queryKey: ['tailors', 'employee'],
    queryFn: () => tailorService.getTailorsForEmployee(),
    enabled,
  });

export const useTailorWorkload = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.TAILOR_WORKLOAD,
    queryFn: () => tailorService.getTailorWorkload(),
    enabled,
  });

export const useTailor = (tailorId: string) =>
  useQuery({
    queryKey: ['tailor', tailorId],
    queryFn: () => tailorService.getTailor(tailorId),
    enabled: !!tailorId,
  });

export const useUpdateTailorMutation = (tailorId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateTailorRequest) => tailorService.updateTailor(tailorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor', tailorId] });
      queryClient.invalidateQueries({ queryKey: ['tailors'] });
      toast.success('Profile updated successfully!');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// Kept separate from useUpdateTailorMutation - verification is a deliberate
// review action (see tailorService.setTailorApproval), not a side effect of
// a general profile-edit save. Same pattern as web's toggleVerification.
export const useSetTailorApprovalMutation = (tailorId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (isApproved: boolean) => tailorService.setTailorApproval(tailorId, isApproved),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor', tailorId] });
      queryClient.invalidateQueries({ queryKey: ['tailors'] });
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteTailorMutation = (tailorId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => tailorService.deleteTailor(tailorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailors'] });
      toast.success('Tailor deleted');
      router.back();
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUploadTailorKycMutation = (tailorId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      uri: string;
      fileName?: string;
      mimeType?: string;
      documentType: 'aadhar' | 'pan_card' | 'other';
    }) => tailorService.uploadKyc(tailorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tailor', tailorId] });
      queryClient.invalidateQueries({ queryKey: ['tailors'] });
      toast.success('Document uploaded successfully');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
