import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { adminService } from '@/services/adminService';

export const useDashboard = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: adminService.getDashboard,
    enabled,
  });
