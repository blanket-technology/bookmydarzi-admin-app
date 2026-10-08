import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  PaymentDetail,
  PaymentStatusUpdateRequest,
  RefundCreateRequest,
  RefundDetail,
  RefundMarkManualRequest,
} from '@/types/payments';

export const paymentService = {
  // GET /api/v1/payments/order/{order_id} — returns a single PaymentDetail (an
  // order carries at most one active BOOKING payment + one BALANCE payment;
  // the backend returns the most relevant one — see payment_service.get_payment_by_order).
  getByOrder: async (orderId: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.get<PaymentDetail>(ENDPOINTS.PAYMENTS.BY_ORDER(orderId));
    return data;
  },

  getById: async (paymentId: string): Promise<PaymentDetail> => {
    const { data } = await apiClient.get<PaymentDetail>(ENDPOINTS.PAYMENTS.BY_ID(paymentId));
    return data;
  },

  // Superadmin only (require_superadmin server-side).
  updateStatus: async (
    paymentId: string,
    payload: PaymentStatusUpdateRequest,
  ): Promise<PaymentDetail> => {
    const { data } = await apiClient.patch<PaymentDetail>(
      ENDPOINTS.PAYMENTS.UPDATE_STATUS(paymentId),
      payload,
    );
    return data;
  },

  // Admin only (require_admin server-side).
  createRefund: async (
    paymentId: string,
    payload: RefundCreateRequest,
  ): Promise<RefundDetail> => {
    const { data } = await apiClient.post<RefundDetail>(
      ENDPOINTS.PAYMENTS.REFUND(paymentId),
      payload,
    );
    return data;
  },

  // Fallback for a refund the Razorpay gateway could not process - does
  // NOT send money anywhere, the admin has already paid the customer
  // manually (UPI/bank transfer via their own banking) and this just
  // records the reference. Only valid on a refund currently "failed".
  markRefundManual: async (
    paymentId: string,
    refundId: string,
    payload: RefundMarkManualRequest,
  ): Promise<RefundDetail> => {
    const { data } = await apiClient.post<RefundDetail>(
      ENDPOINTS.PAYMENTS.REFUND_MARK_MANUAL(paymentId, refundId),
      payload,
    );
    return data;
  },

  listRefunds: async (paymentId: string): Promise<RefundDetail[]> => {
    const { data } = await apiClient.get<RefundDetail[]>(ENDPOINTS.PAYMENTS.REFUND(paymentId));
    return data;
  },
};
