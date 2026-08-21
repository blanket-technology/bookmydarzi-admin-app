import { useMutation, useQuery } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { adminService } from '@/services/adminService';
import { formatApiErrorDetail } from '@/utils/errors';
import { toast } from '@/store/toastStore';

export const useDashboard = (enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.DASHBOARD,
    queryFn: adminService.getDashboard,
    enabled,
    retry: false,
  });

// Same save-to-cache-then-share pattern as useDownloadInvoiceMutation
// (features/orders/hooks/useOrders.ts) - RN has no browser-style "trigger a
// download", so the CSV is written to the device's cache dir and handed to
// the OS share sheet, where the user can save/email/open it in Excel.
export const useExportDashboardCsvMutation = () =>
  useMutation({
    mutationFn: async () => {
      const csv = await adminService.exportDashboardCsv();
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device.');
      }
      const fileName = `bmd_analytics_${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
      const file = new File(new Directory(Paths.cache), fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(csv);
      await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text' });
      return file.uri;
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
