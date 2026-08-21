import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { inventoryService } from '@/services/inventoryService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';
import type { InventoryCreateRequest, InventoryUpdateRequest } from '@/types/inventory';

export const useInventory = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.INVENTORY,
    queryFn: () => inventoryService.list(),
    enabled,
  });

export const useCreateInventoryItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: InventoryCreateRequest) => inventoryService.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVENTORY });
      toast.success('Item added');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUpdateInventoryItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryUpdateRequest }) =>
      inventoryService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVENTORY });
      toast.success('Item updated');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useDeleteInventoryItemMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.INVENTORY });
      toast.success('Item removed');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
