import apiClient from '@/config/axios';
import { ENDPOINTS } from '@/services/endpoints';
import type {
  AdminCancelOrderItemRequest,
  CancellationApproveRequest,
  CancellationListResponse,
  CancellationPatchRequest,
  CancellationPolicyItem,
  CancellationPolicyUpdate,
  CancellationPreview,
  CancellationRejectRequest,
  CancellationsQueryParams,
  ItemCancellationPreview,
  OrderCancellationDetail,
  OrderItemCancellationDetail,
} from '@/types/cancellations';

export const cancellationService = {
  list: async (params?: CancellationsQueryParams): Promise<CancellationListResponse> => {
    const { data } = await apiClient.get<CancellationListResponse>(ENDPOINTS.ADMIN.CANCELLATIONS, {
      params,
    });
    return data;
  },

  // Same penalty-aware preview the customer apps show before confirming,
  // bypassing the contact-support stage gate (admin may cancel any
  // non-terminal order) - see cancellation_service.get_cancellation_preview's
  // is_admin/waive_penalty params.
  getAdminPreview: async (orderId: string, waivePenalty = false): Promise<CancellationPreview> => {
    const { data } = await apiClient.get<CancellationPreview>(
      ENDPOINTS.ADMIN.ORDER_CANCELLATION_PREVIEW(orderId),
      { params: { waive_penalty: waivePenalty } },
    );
    return data;
  },

  // Existing cancellation record for this order (customer-initiated request
  // still pending/approved/rejected/refunded), or null if none - lets the
  // Cancel Order sheet warn before an admin confirms a separate, independent
  // cancellation on an order that already has one in the review queue.
  getRecordForOrder: async (orderId: string): Promise<OrderCancellationDetail | null> => {
    const { data } = await apiClient.get<OrderCancellationDetail | null>(
      ENDPOINTS.ADMIN.ORDER_CANCELLATION_RECORD(orderId),
    );
    return data;
  },

  getById: async (id: string): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.get<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_DETAIL(id),
    );
    return data;
  },

  approve: async (
    id: string,
    payload: CancellationApproveRequest,
  ): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.post<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_APPROVE(id),
      payload,
    );
    return data;
  },

  reject: async (
    id: string,
    payload: CancellationRejectRequest,
  ): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.post<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_REJECT(id),
      payload,
    );
    return data;
  },

  patch: async (
    id: string,
    payload: CancellationPatchRequest,
  ): Promise<OrderCancellationDetail> => {
    const { data } = await apiClient.patch<OrderCancellationDetail>(
      ENDPOINTS.ADMIN.CANCELLATION_DETAIL(id),
      payload,
    );
    return data;
  },

  getPolicy: async (): Promise<CancellationPolicyItem[]> => {
    const { data } = await apiClient.get<CancellationPolicyItem[]>(
      ENDPOINTS.ADMIN.CANCELLATION_POLICY,
    );
    return data;
  },

  updatePolicyStage: async (
    stage: string,
    payload: CancellationPolicyUpdate,
  ): Promise<CancellationPolicyItem> => {
    const { data } = await apiClient.put<CancellationPolicyItem>(
      ENDPOINTS.ADMIN.CANCELLATION_POLICY_STAGE(stage),
      payload,
    );
    return data;
  },

  // Per-item cancel (cancel one line item within a multi-item order,
  // without cancelling the whole order) - admin side. Same
  // penalty/refund-preview-then-confirm shape as the whole-order flow
  // above, bypassing the contact-support stage gate the same way.
  getAdminItemPreview: async (orderId: string, itemId: string): Promise<ItemCancellationPreview> => {
    const { data } = await apiClient.get<ItemCancellationPreview>(
      ENDPOINTS.ADMIN.ORDER_ITEM_CANCELLATION_PREVIEW(orderId, itemId),
    );
    return data;
  },

  cancelItem: async (
    orderId: string,
    itemId: string,
    payload: AdminCancelOrderItemRequest,
  ): Promise<OrderItemCancellationDetail> => {
    const { data } = await apiClient.post<OrderItemCancellationDetail>(
      ENDPOINTS.ADMIN.ORDER_ITEM_CANCEL(orderId, itemId),
      payload,
    );
    return data;
  },
};
