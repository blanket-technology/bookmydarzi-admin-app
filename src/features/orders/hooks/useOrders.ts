import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { orderService } from '@/services/orderService';
import type {
  AdminCancelOrderRequest,
  AdminOrderMeasurementRequest,
  AssignTailorRequest,
  OrderNotesRequest,
  OrderStatusUpdateRequest,
  OrdersQueryParams,
} from '@/types/orders';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

export const useOrders = (params?: OrdersQueryParams, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.ORDERS(params as Record<string, unknown>),
    queryFn: () => orderService.getOrders(params),
    enabled,
  });

export const useAssignTailorMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignTailorRequest;
    }) => orderService.assignTailor(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Tailor assigned successfully');
    },
    onError: () => toast.error('Failed to assign tailor'),
  });
};

export const useUpdateOrderStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: OrderStatusUpdateRequest;
    }) => orderService.updateStatus(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Order status updated');
    },
    onError: () => toast.error('Failed to update order status'),
  });
};

export const useUpdateOrderMeasurementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AdminOrderMeasurementRequest;
    }) => orderService.updateMeasurement(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Measurement updated successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useCancelOrderMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AdminCancelOrderRequest;
    }) => orderService.cancelOrder(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Order cancelled');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useUpdateOrderNotesMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: OrderNotesRequest;
    }) => orderService.updateNotes(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order notes updated');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};
