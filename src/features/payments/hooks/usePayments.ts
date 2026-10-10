import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { paymentService } from '@/features/payments/services/paymentService';
import type {
  PaymentStatusUpdateRequest,
  RefundCreateRequest,
  RefundMarkManualRequest,
} from '@/types/payments';
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
    // Gateway refunds settle asynchronously (initiated -> processed/failed):
    // keep watching until none is in flight so a failure is never missed.
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.some((refund) => refund.status === 'initiated') ? 5000 : false,
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
      toast.success('Refund initiated - the status updates here when the gateway confirms');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Admin fallback when the Razorpay gateway refund failed and won't retry
// successfully. Does NOT send money anywhere - the admin has already paid
// the customer manually (UPI/bank transfer via their own banking) and
// this just records the reference. Only valid on a "failed" refund.
export const useMarkRefundManualMutation = (orderId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      paymentId,
      refundId,
      payload,
    }: {
      paymentId: string;
      refundId: string;
      payload: RefundMarkManualRequest;
    }) => paymentService.markRefundManual(paymentId, refundId, payload),
    onSuccess: (_data, variables) => {
      if (orderId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PAYMENT_BY_ORDER(orderId) });
      }
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.PAYMENT_REFUNDS(variables.paymentId),
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Refund marked as manually completed');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
