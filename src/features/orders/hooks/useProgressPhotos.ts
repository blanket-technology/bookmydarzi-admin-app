import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { progressPhotoService } from '@/features/orders/services/progressPhotoService';
import type { UploadProgressPhotoRequest } from '@/types/progressPhotos';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

// Fetched on demand (order detail "Progress Photos" section expands this) —
// mirrors usePaymentByOrder's enabled-gated pattern to avoid an extra
// request on every order list row.
export const useOrderPhotos = (orderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.ORDER_PHOTOS(orderId ?? ''),
    queryFn: () => progressPhotoService.getByOrder(orderId as string),
    enabled: Boolean(orderId) && enabled,
  });

// Tailor-only server-side. Only succeeds while the order is in
// stitching_started | in_progress | final_check (see _PHOTO_UPLOAD_STAGES
// in app/api/v1/endpoints/orders.py) — the UI should gate the upload button
// on the same statuses so the request isn't attempted needlessly.
export const useUploadProgressPhotoMutation = (orderId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UploadProgressPhotoRequest) =>
      progressPhotoService.upload(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER_PHOTOS(orderId) });
      toast.success('Photo uploaded');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
