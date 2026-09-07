import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { measurementService } from '@/services/measurementService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { MeasurementUpdateRequest } from '@/types/measurements';

// Customer-level saved measurement profiles (USER_MEASUREMENTS) — reusable
// across orders, distinct from a single order's inline measurement fields.
// There is no standalone "create a profile" UI outside an order context -
// new profiles are only ever created inline via MeasurementManageSheet's
// order-scoped collect endpoints (see useOrders.ts's
// useCollectMeasurementMutation / useUpdateOrderMeasurementMutation), which
// persist to USER_MEASUREMENTS the same way. useUpdateMeasurementProfileMutation
// below is the one still-used mutation - it edits an existing saved profile's
// values directly, from that same sheet.
export const useMeasurementProfiles = (userId?: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.MEASUREMENT_PROFILES(userId),
    queryFn: () => measurementService.list(userId),
    enabled: enabled && !!userId,
  });

export const useUpdateMeasurementProfileMutation = (userId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: MeasurementUpdateRequest }) =>
      measurementService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MEASUREMENT_PROFILES(userId) });
      toast.success('Measurement profile updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
