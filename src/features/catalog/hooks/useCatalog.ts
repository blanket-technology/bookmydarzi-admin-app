import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { catalogService } from '@/services/catalogService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { CategoryPayload, ServiceAddonPayload, ServiceLinePayload, ServicePayload } from '@/types/catalog';

export const useCatalogTree = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.CATALOG_TREE,
    queryFn: () => catalogService.getAdminTree(),
    enabled,
  });

const invalidateTree = (queryClient: ReturnType<typeof useQueryClient>) =>
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CATALOG_TREE });

export const useCreateCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CategoryPayload) => catalogService.createCategory(payload),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Category created'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CategoryPayload> }) =>
      catalogService.updateCategory(id, payload),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Category updated'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteCategoryMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogService.deleteCategory(id),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Category deactivated'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCreateServiceLineMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceLinePayload) => catalogService.createServiceLine(payload),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Service line created'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateServiceLineMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ServiceLinePayload> }) =>
      catalogService.updateServiceLine(id, payload),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Service line updated'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteServiceLineMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogService.deleteServiceLine(id),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Service line deactivated'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useCreateServiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServicePayload) => catalogService.createService(payload),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Service created'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateServiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ServicePayload> }) =>
      catalogService.updateService(id, payload),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Service updated'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteServiceMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => catalogService.deleteService(id),
    onSuccess: () => { invalidateTree(queryClient); toast.success('Service deactivated'); },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUploadCatalogImageMutation = () =>
  useMutation({
    mutationFn: ({ uri, fileName, mimeType }: { uri: string; fileName?: string; mimeType?: string }) =>
      catalogService.uploadImage(uri, fileName, mimeType),
    onError: (error) => toast.error(getMutationError(error)),
  });

// Per-service add-on management - mirrors final's AddonsManagerPanel.jsx.
// Distinct from useServiceAddons (public, active-only, in useOrders.ts) -
// this is the admin CRUD surface, including inactive add-ons.
export const useAdminServiceAddons = (serviceId: string | number, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.ADMIN_SERVICE_ADDONS(serviceId),
    queryFn: () => catalogService.getAdminServiceAddons(serviceId),
    enabled: enabled && !!serviceId,
  });

export const useCreateServiceAddonMutation = (serviceId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ServiceAddonPayload) => catalogService.createServiceAddon(serviceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SERVICE_ADDONS(serviceId) });
      toast.success('Add-on created');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateServiceAddonMutation = (serviceId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ addonId, payload }: { addonId: string | number; payload: Partial<ServiceAddonPayload> }) =>
      catalogService.updateServiceAddon(serviceId, addonId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SERVICE_ADDONS(serviceId) });
      toast.success('Add-on updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteServiceAddonMutation = (serviceId: string | number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addonId: string | number) => catalogService.deleteServiceAddon(serviceId, addonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ADMIN_SERVICE_ADDONS(serviceId) });
      toast.success('Add-on deleted');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
