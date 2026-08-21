import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { rbacService } from '@/services/rbacService';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

export const useRbacScreens = () =>
  useQuery({
    queryKey: QUERY_KEYS.RBAC_SCREENS,
    queryFn: () => rbacService.getScreens(),
    select: (screens) => screens.filter((s) => s.is_active && s.app === 'admin_panel'),
    staleTime: 5 * 60 * 1000,
  });

export const useRbacPermissions = () =>
  useQuery({
    queryKey: QUERY_KEYS.RBAC_PERMISSIONS,
    queryFn: () => rbacService.getPermissions(),
    staleTime: 5 * 60 * 1000,
  });

export const useEffectivePermissions = (userId: number) =>
  useQuery({
    queryKey: QUERY_KEYS.RBAC_EFFECTIVE(userId),
    queryFn: () => rbacService.getEffectivePermissions(userId),
    enabled: !!userId,
  });

export const useLockoutStatus = (userId: number) =>
  useQuery({
    queryKey: QUERY_KEYS.RBAC_LOCKOUT_STATUS(userId),
    queryFn: () => rbacService.getLockoutStatus(userId),
    enabled: !!userId,
  });

const invalidateEffective = (queryClient: ReturnType<typeof useQueryClient>, userId: number) =>
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RBAC_EFFECTIVE(userId) });

export const useGrantPermissionMutation = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { screenId: number; permissionId: number }) =>
      rbacService.grantPermission({ userId, ...params }),
    onSuccess: () => invalidateEffective(queryClient, userId),
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useRevokePermissionMutation = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { screenId: number; permissionId: number }) =>
      rbacService.revokePermission({ userId, ...params }),
    onSuccess: () => invalidateEffective(queryClient, userId),
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useClearOverrideMutation = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mappingId: number) => rbacService.clearOverride(mappingId),
    onSuccess: () => invalidateEffective(queryClient, userId),
    onError: (error) => toast.error(getMutationError(error)),
  });
};

export const useUnlockAccountMutation = (userId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => rbacService.unlockAccount(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.RBAC_LOCKOUT_STATUS(userId) });
      toast.success('Account unlocked.');
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};
