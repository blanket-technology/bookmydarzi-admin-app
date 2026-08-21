import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { auditLogService } from '@/services/auditLogService';
import type { AuditLogListParams } from '@/types/auditLog';

export const useAuditLogs = (params: AuditLogListParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.AUDIT_LOGS(params as Record<string, unknown>),
    queryFn: () => auditLogService.list(params),
    enabled,
  });

export const useAuditLogFilterOptions = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.AUDIT_LOG_FILTERS,
    queryFn: () => auditLogService.filterOptions(),
    enabled,
    staleTime: 5 * 60_000,
  });
