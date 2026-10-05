import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { homepageService } from '@/services/homepageService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { BannerCreateRequest, BannerUpdateRequest } from '@/types/homepage';

export const useBanners = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.HOMEPAGE_BANNERS,
    queryFn: () => homepageService.getBanners(),
    enabled,
  });

export const useUploadBannerImageMutation = () =>
  useMutation({
    mutationFn: (file: { uri: string; fileName?: string; mimeType?: string }) =>
      homepageService.uploadBannerImage(file),
    onError: (error) => toast.error(getMutationError(error)),
  });

export const useCreateBannerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BannerCreateRequest) => homepageService.createBanner(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOMEPAGE_BANNERS });
      toast.success('Banner created');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateBannerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: BannerUpdateRequest }) =>
      homepageService.updateBanner(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOMEPAGE_BANNERS });
      toast.success('Banner updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteBannerMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => homepageService.deleteBanner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HOMEPAGE_BANNERS });
      toast.success('Banner removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useClearHomepageCacheMutation = () =>
  useMutation({
    mutationFn: () => homepageService.clearCache(),
    onSuccess: () => toast.success('Homepage cache cleared'),
    onError: (error) => toast.error(getMutationError(error)),
  });
