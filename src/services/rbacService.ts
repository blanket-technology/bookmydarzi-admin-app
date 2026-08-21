import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  EffectivePermissions,
  LockoutStatus,
  RbacPermission,
  RbacScreen,
  UserScreenPermissionRow,
} from '@/types/rbac';

export const rbacService = {
  getScreens: async (): Promise<RbacScreen[]> => {
    const { data } = await apiClient.get<RbacScreen[]>(ENDPOINTS.RBAC.SCREENS);
    return data;
  },

  getPermissions: async (): Promise<RbacPermission[]> => {
    const { data } = await apiClient.get<RbacPermission[]>(ENDPOINTS.RBAC.PERMISSIONS);
    return data;
  },

  getEffectivePermissions: async (userId: number): Promise<EffectivePermissions> => {
    const { data } = await apiClient.get<EffectivePermissions>(ENDPOINTS.RBAC.EFFECTIVE(userId));
    return data;
  },

  getMyEffectivePermissions: async (): Promise<EffectivePermissions> => {
    const { data } = await apiClient.get<EffectivePermissions>(ENDPOINTS.RBAC.MY_EFFECTIVE);
    return data;
  },

  getLockoutStatus: async (userId: number): Promise<LockoutStatus> => {
    const { data } = await apiClient.get<LockoutStatus>(ENDPOINTS.RBAC.LOCKOUT_STATUS(userId));
    return data;
  },

  unlockAccount: async (userId: number): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(ENDPOINTS.RBAC.UNLOCK(userId));
    return data;
  },

  grantPermission: async (params: {
    userId: number;
    screenId: number;
    permissionId: number;
  }): Promise<UserScreenPermissionRow> => {
    const { data } = await apiClient.post<UserScreenPermissionRow>(ENDPOINTS.RBAC.GRANT, {
      user_id: params.userId,
      screen_id: params.screenId,
      permission_id: params.permissionId,
    });
    return data;
  },

  revokePermission: async (params: {
    userId: number;
    screenId: number;
    permissionId: number;
  }): Promise<{ message: string }> => {
    const { data } = await apiClient.post<{ message: string }>(ENDPOINTS.RBAC.REVOKE, {
      user_id: params.userId,
      screen_id: params.screenId,
      permission_id: params.permissionId,
    });
    return data;
  },

  clearOverride: async (mappingId: number): Promise<{ message: string }> => {
    const { data } = await apiClient.delete<{ message: string }>(
      ENDPOINTS.RBAC.CLEAR_OVERRIDE(mappingId),
    );
    return data;
  },
};
