import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { orderService } from '@/services/orderService';
import { useAuth } from '@/hooks/useAuth';
import type {
  AdminCancelOrderRequest,
  AdminOrderMeasurementRequest,
  AssignTailorRequest,
  CollectPaymentRequest,
  OrderNotesRequest,
  OrderStatusUpdateRequest,
  OrdersQueryParams,
  RejectOrderRequest,
  SchedulePickupRequest,
} from '@/types/orders';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail } from '@/utils/errors';

// GET /admin/orders excludes the TAILOR role server-side (require_roles
// ADMIN/SUPERADMIN/EMPLOYEE) — tailors must use GET /orders/my-orders
// instead, which orderService.getMyOrders normalizes to the same shape.
export const useOrders = (params?: OrdersQueryParams, enabled = true) => {
  const { user, selectedRole } = useAuth();
  const role = String(user?.role ?? selectedRole ?? '').toLowerCase();
  const isTailor = role === 'tailor';

  return useQuery({
    queryKey: QUERY_KEYS.ORDERS({ ...(params as Record<string, unknown>), role }),
    queryFn: () =>
      isTailor ? orderService.getMyOrders(params) : orderService.getOrders(params),
    enabled,
  });
};

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
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Admin-only "correct a stuck order" escape hatch — see orderService.updateStatus.
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
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Tailor-only stitching-stage transitions — see orderService.updateStitchingStatus.
export const useUpdateStitchingStatusMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: OrderStatusUpdateRequest;
    }) => orderService.updateStitchingStatus(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Order status updated');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
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

const useEmployeeActionMutation = <TPayload = void>(
  mutationFn: (orderId: string, payload: TPayload) => Promise<unknown>,
  successMessage: string,
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, payload }: { orderId: string; payload: TPayload }) =>
      mutationFn(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success(successMessage);
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useAcceptOrderMutation = () =>
  useEmployeeActionMutation<void>(
    (orderId) => orderService.acceptOrder(orderId),
    'Order accepted',
  );

export const useRejectOrderMutation = () =>
  useEmployeeActionMutation<RejectOrderRequest | undefined>(
    (orderId, payload) => orderService.rejectOrder(orderId, payload),
    'Order rejected',
  );

export const useSchedulePickupMutation = () =>
  useEmployeeActionMutation<SchedulePickupRequest | undefined>(
    (orderId, payload) => orderService.schedulePickup(orderId, payload),
    'Pickup scheduled',
  );

export const useConfirmPickupMutation = () =>
  useEmployeeActionMutation<void>(
    (orderId) => orderService.confirmPickup(orderId),
    'Pickup confirmed',
  );

export const useHandToTailorMutation = () =>
  useEmployeeActionMutation<void>(
    (orderId) => orderService.handToTailor(orderId),
    'Handed to tailor',
  );

export const useMarkOutForDeliveryMutation = () =>
  useEmployeeActionMutation<void>(
    (orderId) => orderService.markOutForDelivery(orderId),
    'Order marked out for delivery',
  );

export const useCompleteOrderMutation = () =>
  useEmployeeActionMutation<void>(
    (orderId) => orderService.completeOrder(orderId),
    'Order completed',
  );

export const useCollectPaymentMutation = () =>
  useEmployeeActionMutation<CollectPaymentRequest>(
    (orderId, payload) => orderService.collectPayment(orderId, payload),
    'Payment collected',
  );
