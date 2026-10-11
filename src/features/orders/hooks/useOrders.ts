import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { orderService } from '@/services/orderService';
import { catalogService } from '@/services/catalogService';
import { cancellationService } from '@/services/cancellationService';
import { useAuth } from '@/hooks/useAuth';
import type {
  AdminCancelOrderRequest,
  AdminOrderMeasurementRequest,
  AssignBridgeEmployeeRequest,
  AssignTailorRequest,
  CollectPaymentRequest,
  EmployeeAddOrderAddonRequest,
  OrderNotesRequest,
  OrderStatusUpdateRequest,
  OrdersQueryParams,
  RejectOrderRequest,
  SchedulePickupRequest,
} from '@/types/orders';
import type { EmployeeOrderMeasurementRequest } from '@/types/measurements';
import { toast } from '@/store/toastStore';
import { formatApiErrorDetail, getMutationError } from '@/utils/errors';

// GET /admin/orders excludes the TAILOR role server-side (require_roles
// ADMIN/SUPERADMIN/EMPLOYEE) — tailors must use GET /orders/my-orders
// instead, which orderService.getMyOrders normalizes to the same shape.
//
// GET /admin/orders itself does NOT auto-scope by caller identity — it's an
// admin-shaped "list everything, optionally filtered" endpoint that also
// happens to allow the EMPLOYEE role in (list_all_orders_admin /
// tracking_service.py only filters by employee_id when the query param is
// explicitly passed). Without this, an employee saw every order in the
// system here, not just their own assigned ones. Auto-inject employee_id
// from the caller's own id — same "scope by role automatically" pattern as
// the isTailor branch above — unless the caller already passed one
// explicitly (e.g. an admin filtering the list by a specific employee).
export const useOrders = (params?: OrdersQueryParams, enabled = true) => {
  const { user, selectedRole } = useAuth();
  const role = String(user?.role ?? selectedRole ?? '').toLowerCase();
  const isTailor = role === 'tailor';
  const isEmployee = role === 'employee';

  // For an employee "my orders" means every job they hold: the pickup leg
  // (employee_id) AND the delivery leg (delivery_employee_id). Filtering on the
  // pickup leg alone hid every order they were delivering.
  const scopeToSelf = isEmployee && !params?.employee_id && !params?.delivery_employee_id && !!user?.id;
  const scopedParams: OrdersQueryParams | undefined = scopeToSelf
    ? { ...params, employee_id: user?.id }
    : params;

  return useQuery({
    queryKey: QUERY_KEYS.ORDERS({ ...(scopedParams as Record<string, unknown>), role, scopeToSelf }),
    queryFn: async () => {
      if (isTailor) return orderService.getMyOrders(scopedParams);
      if (!scopeToSelf) return orderService.getOrders(scopedParams);

      const [pickupLeg, deliveryLeg] = await Promise.all([
        orderService.getOrders(scopedParams),
        orderService.getOrders({ ...params, delivery_employee_id: user?.id }),
      ]);
      const byId = new Map<string, (typeof pickupLeg.orders)[number]>();
      [...pickupLeg.orders, ...deliveryLeg.orders].forEach((order) => byId.set(String(order.order_id), order));
      const orders = [...byId.values()].sort(
        (a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      );
      return {
        orders,
        total: Math.max(pickupLeg.total, deliveryLeg.total, orders.length),
        page: pickupLeg.page,
        limit: pickupLeg.limit,
      };
    },
    enabled,
    // Keep showing the previous list while the next search/page loads (no skeleton flash).
    placeholderData: (previous) => previous,
  });
};

// Single-order fetch — replaces re-deriving "detail" from a capped list
// fetch + client-side .find(), which showed false "not found" for any
// order outside the first page. Safe for every role (see
// orderService.getOrderById / backend assert_can_view_order).
export const useOrder = (orderId: string, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.ORDER(orderId),
    queryFn: () => orderService.getOrderById(orderId),
    enabled: enabled && !!orderId,
  });

// Active add-ons available for the specific service booked on this order
// item - used by AddOrderAddonSheet so the employee picks from the real
// catalog for that service, not a free-text guess. Public endpoint (no
// auth requirement server-side), but still gated on `enabled` so it only
// fires once the sheet is actually open with a resolved service id.
export const useServiceAddons = (serviceId: string | number | undefined, enabled = true) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_ADDONS(serviceId ?? ''),
    queryFn: () => catalogService.getServiceAddons(serviceId as string | number),
    enabled: enabled && serviceId != null,
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Tailor assigned successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Bridge/employee picker for the manual pickup/delivery assignment
// mutations below - lazily enabled (pass true only once the picker sheet
// opens) since it's not needed for the rest of the order-detail screen.
export const useBridgeEmployees = (enabled = false) =>
  useQuery({
    queryKey: ['bridge-employees'],
    queryFn: () => orderService.getBridgeEmployees(),
    enabled,
  });

// Manual Bridge/employee assignment for the pickup and delivery legs - the
// admin-panel lever for when no Bridge employee accepts the automatic
// broadcast. Same invalidation/toast shape as useAssignTailorMutation.
export const useAssignPickupEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignBridgeEmployeeRequest;
    }) => orderService.assignPickupEmployee(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Pickup employee assigned successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useAssignDeliveryEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignBridgeEmployeeRequest;
    }) => orderService.assignDeliveryEmployee(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Delivery employee assigned successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useAssignReturnEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignBridgeEmployeeRequest;
    }) => orderService.assignReturnEmployee(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Return employee assigned successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useAssignRepairPickupEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignBridgeEmployeeRequest;
    }) => orderService.assignRepairPickupEmployee(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Repair-pickup employee assigned successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

export const useAssignRepairDeliveryEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignBridgeEmployeeRequest;
    }) => orderService.assignRepairDeliveryEmployee(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Repair-delivery employee assigned successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Employee-scoped tailor assignment — PATCH /employee/orders/{id}/assign-tailor,
// distinct endpoint from useAssignTailorMutation above (admin-only route).
export const useAssignTailorEmployeeMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: AssignTailorRequest;
    }) => orderService.assignTailorEmployee(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Order status updated');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Tailor-only: marks an IN_REPAIR order's repair done - see
// orderService.completeRepair.
export const useCompleteRepairMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId }: { orderId: string }) => orderService.completeRepair(orderId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success('Repair marked complete');
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      toast.success('Measurement updated successfully');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Same penalty-aware preview the customer apps show before confirming - see
// cancellationService.getAdminPreview. enabled only while the sheet is open,
// refetches when the waive-penalty toggle changes (waivePenalty is part of
// the query key) so the previewed numbers update live.
export const useAdminCancellationPreview = (orderId: string, waivePenalty: boolean, enabled: boolean) =>
  useQuery({
    queryKey: ['admin-cancellation-preview', orderId, waivePenalty],
    queryFn: () => cancellationService.getAdminPreview(orderId, waivePenalty),
    enabled: enabled && !!orderId,
  });

// Existing cancellation-request record for this order, if any - see
// cancellationService.getRecordForOrder's own comment.
export const useOrderCancellationRecord = (orderId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['order-cancellation-record', orderId],
    queryFn: () => cancellationService.getRecordForOrder(orderId),
    enabled: enabled && !!orderId,
  });

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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      toast.success('Order notes updated');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Admin/superadmin recovery tool — see orderService.triggerBroadcast.
export const useTriggerBroadcastMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => orderService.triggerBroadcast(orderId),
    onSuccess: (_data, orderId) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
      toast.success('Broadcast triggered');
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
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
      toast.success(successMessage);
    },
    onError: (error) => toast.error(getMutationError(error)),
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

// No useMarkOutForDeliveryMutation here - PATCH /employee/orders/{id}/delivery
// is deprecated server-side and unconditionally 400s (employee_order_service.py).
// Once an order reaches READY_FOR_DISPATCH it becomes a delivery-broadcast
// candidate automatically; the employee claims it via Accept on the
// Deliveries screen instead (see useOrderActions.ts's own note on this).

export const useCompleteOrderMutation = () =>
  useEmployeeActionMutation<void>(
    (orderId) => orderService.completeOrder(orderId),
    'Delivery confirmed',
  );

// Customer declined to accept the finished garment at the door. Backend
// computes any refund/penalty and schedules the return directly with this
// same delivery employee (no re-broadcast) - see cancellation_service.py's
// refuse_delivery.
export const useRefuseDeliveryMutation = () =>
  useEmployeeActionMutation<string>(
    (orderId, reason) => orderService.refuseDelivery(orderId, reason),
    'Delivery marked as refused - return scheduled',
  );

// Cash collection (the fallback when the QR cannot be used). QR payments are
// confirmed by the backend itself - see useDeliveryPaymentStatus.
export const useCollectPaymentMutation = () =>
  useEmployeeActionMutation<CollectPaymentRequest>(
    (orderId, payload) => orderService.collectPayment(orderId, payload),
    'Cash payment recorded',
  );

const refreshOrderCaches = (queryClient: ReturnType<typeof useQueryClient>, orderId: string) => {
  queryClient.invalidateQueries({ queryKey: ['orders'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(orderId) });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DASHBOARD });
};

/** Live delivery-payment state. Polls every 3 s while a QR is waiting for the
 * customer; stops by itself once the state is final (paid / expired / ...).
 * The backend also pushes ORDER_STATUS_UPDATED over the socket, so the screen
 * usually updates before the next poll. */
export const useDeliveryPaymentStatus = (orderId: string, enabled: boolean) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...QUERY_KEYS.ORDER(orderId), 'delivery-payment'] as const,
    queryFn: async () => {
      const result = await orderService.getDeliveryPaymentStatus(orderId);
      if (result.status === 'paid') refreshOrderCaches(queryClient, orderId);
      return result;
    },
    enabled: enabled && !!orderId,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 3000 : false),
    refetchIntervalInBackground: false,
    gcTime: 0,
    retry: 1,
  });
};

export const useCreateDeliveryQrMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => orderService.createDeliveryPaymentQr(orderId),
    onSuccess: (data, orderId) => {
      queryClient.setQueryData([...QUERY_KEYS.ORDER(orderId), 'delivery-payment'], data);
    },
    // The sheet renders the failure inline with a retry action - no toast.
  });
};

export const useCancelDeliveryQrMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => orderService.cancelDeliveryPaymentQr(orderId),
    onSuccess: (data, orderId) => {
      queryClient.setQueryData([...QUERY_KEYS.ORDER(orderId), 'delivery-payment'], data);
    },
    onError: (error) => toast.error(getMutationError(error)),
  });
};

// Employee notices at pickup that the customer also wants an extra (e.g.
// a button replaced) that wasn't selected online - see orderService.
// addOrderAddon. Increases the order's balance due; collecting it is a
// separate useCollectPaymentMutation call, same as any other COD balance.
export const useAddOrderAddonMutation = () =>
  useEmployeeActionMutation<EmployeeAddOrderAddonRequest>(
    (orderId, payload) => orderService.addOrderAddon(orderId, payload),
    'Add-on added to order',
  );

// Employee-side measurement collection — see orderService.collectMeasurement.
// Also invalidates the customer's saved measurement-profile list, since a
// new profile may have just been created (attach_measurement_to_order).
export const useCollectMeasurementMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      payload,
    }: {
      orderId: string;
      payload: EmployeeOrderMeasurementRequest;
    }) => orderService.collectMeasurement(orderId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ORDER(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: ['measurement-profiles'] });
      toast.success('Measurement saved');
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
};

// Polls while an order is actually mid-broadcast — same table BMD-Admin web
// shows (OrderFullDetails.jsx's Broadcast Monitor) of which tailors were
// offered this order, which round, and how they responded. Admin/employee
// only server-side (broadcast.py's get_broadcast_status).
export const useOrderBroadcastStatus = (orderId: string, enabled = true) =>
  useQuery({
    queryKey: ['order-broadcast-status', orderId],
    queryFn: () => orderService.getBroadcastStatus(orderId),
    enabled: enabled && !!orderId,
    refetchInterval: enabled ? 15_000 : false,
  });

// Downloads the invoice PDF to the device's cache dir, then hands off to
// the OS share sheet — RN has no browser-style "trigger a file download",
// so save-then-share is the standard pattern (mirrors BMD-Admin web's
// blob-download, adapted for native). expo-sharing.shareAsync lets the user
// save/print/email it from there.
export const useDownloadInvoiceMutation = () =>
  useMutation({
    mutationFn: async ({ orderId, orderCode }: { orderId: string; orderCode?: string | null }) => {
      const bytes = await orderService.getInvoiceBytes(orderId);
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        throw new Error('Sharing is not available on this device.');
      }
      const fileName = `invoice-${orderCode ?? orderId}.pdf`;
      const file = new File(new Directory(Paths.cache), fileName);
      if (file.exists) file.delete();
      file.create();
      file.write(new Uint8Array(bytes));
      await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
      return file.uri;
    },
    onError: (error) => toast.error(formatApiErrorDetail(error)),
  });
