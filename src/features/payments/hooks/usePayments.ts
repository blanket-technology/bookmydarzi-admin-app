import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { paymentService } from '@/features/payments/services/paymentService';
import type { PaymentStatusUpdateRequest, RefundCreateRequest } from '@/types/payments';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

// Payment for an order is only fetched on demand (order detail "View Payment"
// action expands this section) — avoids an extra request on every list row.
export const usePaymentByOrder = (orderId: string | undefined, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.PAYMENT_BY_ORDER(orderId ?? ''),
    queryFn: () => paymentService.getByOrder(orderId as string),
    enabled: Boolean(orderId) && enabled,
    retry: false,
  });

export const usePaymentRefunds = (paymentId: number | undefined, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.PAYMENT_REFUNDS(String(paymentId ?? '')),
    queryFn: () => paymentService.listRefunds(String(paymentId)),
    enabled: Boolean(paymentId) && enabled,
  });

// Superadmin-only escape hatch for manually correcting a stuck payment record
// (e.g. gateway succeeded but webhook was missed). Mirrors update_payment_status.
export const useUpdatePaymentStatusMutation = (orderId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      payload: PaymentStatusUpdateRequest;
    }) => paymentService.updateStatus(paymentId, payload),
    onSuccess: () => {
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENT_BY_ORDER(orderId) });
      }
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Payment status updated');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Admin-only full/partial refund. Online payments route through Razorpay;
// COD/manual payments are recorded as settled outside the gateway.
export const useCreateRefundMutation = (orderId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      payload,
    }: {
      paymentId: string;
      payload: RefundCreateRequest;
    }) => paymentService.createRefund(paymentId, payload),
    onSuccess: (_data, variables) => {
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENT_BY_ORDER(orderId) });
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PAYMENT_REFUNDS(variables.paymentId),
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Refund issued');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
