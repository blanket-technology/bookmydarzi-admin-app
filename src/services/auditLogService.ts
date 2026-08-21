import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type { AuditLogFilterOptions, AuditLogListParams, AuditLogListResponse } from '@/types/auditLog';

export const auditLogService = {
  list: async (params: AuditLogListParams): Promise<AuditLogListResponse> => {
    const { data } = await apiClient.get<AuditLogListResponse>(ENDPOINTS.ADMIN.AUDIT_LOGS, { params });
    return data;
  },

  filterOptions: async (): Promise<AuditLogFilterOptions> => {
    const { data } = await apiClient.get<AuditLogFilterOptions>(ENDPOINTS.ADMIN.AUDIT_LOG_FILTERS);
    return data;
  },
};
