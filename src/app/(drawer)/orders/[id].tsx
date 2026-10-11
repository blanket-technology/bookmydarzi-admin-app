import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { SUPPORT_PHONE_NUMBER } from '@/constants/support';
import { Button, ConfirmModal, EmptyState, Header, Loader, Pressable, ScreenContent } from '@/components/ui';
import { ORDER_STATUS, orderStatusLabel } from '@/constants/orderStatus';
import {
  useOrder,
  useOrderBroadcastStatus,
  useTriggerBroadcastMutation,
  useAssignTailorMutation,
  useAssignTailorEmployeeMutation,
  useAssignDeliveryEmployeeMutation,
  useAssignReturnEmployeeMutation,
  useAssignRepairPickupEmployeeMutation,
  useAssignRepairDeliveryEmployeeMutation,
  useBridgeEmployees,
  useUpdateOrderStatusMutation,
  useDownloadInvoiceMutation,
} from '@/features/orders/hooks/useOrders';
import { useOrderActions, type OrderAction } from '@/features/orders/hooks/useOrderActions';
import { usePickupBroadcastOffers, useAcceptPickupBroadcastMutation } from '@/features/pickups/hooks/usePickups';
import { useDeliveryBroadcastOffers, useAcceptDeliveryBroadcastMutation } from '@/features/deliveries/hooks/useDeliveries';
import { useMarkReturnInTransitMutation, useMarkReturnCompleteMutation } from '@/features/returns/hooks/useReturns';
import {
  useMarkRepairPickupDeliveredToTailorMutation,
  useMarkRepairPickupInTransitMutation,
} from '@/features/repairPickups/hooks/useRepairPickups';
import {
  useMarkRepairDeliveryCompleteMutation,
  useMarkRepairDeliveryInTransitMutation,
} from '@/features/repairDeliveries/hooks/useRepairDeliveries';
import { MeasurementManageSheet } from '@/features/orders/components/MeasurementManageSheet';
import { AddOrderAddonSheet } from '@/features/orders/components/AddOrderAddonSheet';
import { UpdateProgressSheet } from '@/features/orders/components/UpdateProgressSheet';
import { ProgressPhotosSection } from '@/features/orders/components/ProgressPhotosSection';
import { PendingOfferCard } from '@/features/orders/components/PendingOfferCard';
import { OrderStepper } from '@/features/orders/components/OrderStepper';
import { OrderSummaryCard } from '@/features/orders/components/OrderSummaryCard';
import { StickyActionBar } from '@/features/orders/components/StickyActionBar';
import { orderNextStepHint } from '@/features/orders/workflowHints';
import { OrderAddressCard } from '@/features/orders/components/OrderAddressCard';
import { OrderNotesCard } from '@/features/orders/components/OrderNotesCard';
import { RepairRequestCard } from '@/features/orders/components/RepairRequestCard';
import { OrderNotesEditSheet } from '@/features/orders/components/OrderNotesEditSheet';
import { OrderMeasurementCard } from '@/features/orders/components/OrderMeasurementCard';
import { OrderItemsCard } from '@/features/orders/components/OrderItemsCard';
import { BroadcastMonitorCard } from '@/features/orders/components/BroadcastMonitorCard';
import { AdminToolsSection } from '@/features/orders/components/AdminToolsSection';
import { AssignTailorSheet } from '@/features/orders/components/AssignTailorSheet';
import { AssignBridgeEmployeeSheet } from '@/features/orders/components/AssignBridgeEmployeeSheet';
import { SchedulePickupSheet } from '@/features/orders/components/SchedulePickupSheet';
import { CorrectStatusSheet } from '@/features/orders/components/CorrectStatusSheet';
import { RefuseDeliverySheet } from '@/features/orders/components/RefuseDeliverySheet';
import { RejectOrderSheet } from '@/features/orders/components/RejectOrderSheet';
import { CancelOrderSheet } from '@/features/orders/components/CancelOrderSheet';
import { CollectPaymentSheet } from '@/features/orders/components/CollectPaymentSheet';
import { PaymentDetailsSheet } from '@/features/orders/components/PaymentDetailsSheet';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTailors, useTailorsForEmployee } from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';
import type { OrderStatus } from '@/types/orders';
import { formatApiErrorDetail } from '@/utils/errors';

/**
 * Order detail screen, shared by all 4 roles (Admin/Superadmin/Tailor/
 * Bridge-Employee) - which cards and actions are visible is driven entirely
 * by role flags computed below and by useOrderActions (which already
 * centralizes "what buttons does this role get for this order status").
 *
 * Previously a single 1172-line file; the cards, action sheets, and payment
 * details view are now each their own small component under
 * features/orders/components/ (see that directory) - same behavior, same
 * single route, but each piece is independently readable and safe to touch
 * without re-deriving the whole screen's state first. No mutation/query
 * logic moved or changed in this split, only where the JSX/local-state for
 * each card and sheet lives.
 */
export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { user, selectedRole } = useAuth();

  const [assignSheetVisible, setAssignSheetVisible] = useState(false);
  const [assignDeliverySheetVisible, setAssignDeliverySheetVisible] = useState(false);
  const [assignReturnSheetVisible, setAssignReturnSheetVisible] = useState(false);
  const [assignRepairPickupSheetVisible, setAssignRepairPickupSheetVisible] = useState(false);
  const [assignRepairDeliverySheetVisible, setAssignRepairDeliverySheetVisible] = useState(false);
  const [schedulePickupSheetVisible, setSchedulePickupSheetVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [measurementManageSheetVisible, setMeasurementManageSheetVisible] = useState(false);
  const [measurementManageSheetIsAdmin, setMeasurementManageSheetIsAdmin] = useState(false);
  // Which line item the measurement sheet is targeting - undefined for
  // single-item orders (backend accepts omitted order_item_id there).
  const [measurementTargetItem, setMeasurementTargetItem] = useState<{ id?: number; label?: string } | null>(null);
  const [addAddonSheetVisible, setAddAddonSheetVisible] = useState(false);
  // Same "which item" targeting as measurementTargetItem, plus the
  // service_id needed to fetch that item's own add-on catalog.
  const [addAddonTargetItem, setAddAddonTargetItem] = useState<{ id?: number; label?: string; serviceId?: number } | null>(null);
  const [rejectSheetVisible, setRejectSheetVisible] = useState(false);
  const [refuseDeliverySheetVisible, setRefuseDeliverySheetVisible] = useState(false);
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [collectSheetVisible, setCollectSheetVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<OrderAction | null>(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [notesSheetVisible, setNotesSheetVisible] = useState(false);
  const [broadcastConfirmVisible, setBroadcastConfirmVisible] = useState(false);
  // Only "Update Progress" (STITCHING_STARTED -> IN_PROGRESS) opens this
  // sheet - see useOrderActions.ts's opensProgressSheet - so there's only
  // ever one stage to open it for, no need to track which.
  const [updateProgressSheetVisible, setUpdateProgressSheetVisible] = useState(false);

  const role = user?.role ?? selectedRole ?? undefined;
  const normalizedRole = String(role ?? '').toLowerCase();
  const isSuperadmin = normalizedRole === 'superadmin';
  const isAdminRole = isSuperadmin || normalizedRole === 'admin';
  const isEmployeeRole = normalizedRole === 'employee';
  const isTailorRole = normalizedRole === 'tailor';
  // Payment/refund viewing (read-only) is ADMIN_STAFF_ROLES server-side
  // (includes EMPLOYEE) - see get_payment_by_order / get_refunds_for_payment
  // in app/services/payments/. Broader than isAdminRole, which is reserved
  // for admin-only actions (broadcast force-restart, order notes editing,
  // force-cancel).
  const isStaffRole = isAdminRole || isEmployeeRole;

  // If THIS employee has a pending pickup/delivery broadcast offer for this
  // order, surface an inline Accept card (FCFS - matches the broadcast
  // targeting). Reuses the same offer queries as the Pickups/Deliveries screens.
  const { data: pickupOffersData } = usePickupBroadcastOffers(isEmployeeRole);
  const { data: deliveryOffersData } = useDeliveryBroadcastOffers(isEmployeeRole);
  const acceptPickupMutation = useAcceptPickupBroadcastMutation();
  const acceptDeliveryMutation = useAcceptDeliveryBroadcastMutation();
  const pendingPickupOffer = (pickupOffersData?.broadcasts ?? []).some((o) => String(o.order_id) === String(id));
  const pendingDeliveryOffer = (deliveryOffersData?.broadcasts ?? []).some((o) => String(o.order_id) === String(id));

  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  // Admin/superadmin see the full tailor list (contact details, KYC urls);
  // employees see a stripped, PII-free list via a separate endpoint - see
  // GET /employee/tailors vs GET /admin/tailors.
  const { data: adminTailorsData } = useTailors(undefined, isAdminRole);
  const { data: employeeTailorsData } = useTailorsForEmployee(isEmployeeRole);
  const assignMutation = useAssignTailorMutation();
  const assignEmployeeMutation = useAssignTailorEmployeeMutation();
  // Bridge/employee picker for the manual delivery/return-assignment sheets
  // below - lazily enabled only once one of them is actually open. Pickup's
  // own picker lives inside SchedulePickupSheet now (its own
  // useBridgeEmployees call).
  const { data: bridgeEmployeesData } = useBridgeEmployees(
    isStaffRole &&
      (assignDeliverySheetVisible ||
        assignReturnSheetVisible ||
        assignRepairPickupSheetVisible ||
        assignRepairDeliverySheetVisible),
  );
  const bridgeEmployees = bridgeEmployeesData ?? [];
  const assignDeliveryEmployeeMutation = useAssignDeliveryEmployeeMutation();
  const assignReturnEmployeeMutation = useAssignReturnEmployeeMutation();
  const assignRepairPickupEmployeeMutation = useAssignRepairPickupEmployeeMutation();
  const assignRepairDeliveryEmployeeMutation = useAssignRepairDeliveryEmployeeMutation();
  const statusMutation = useUpdateOrderStatusMutation();
  const triggerBroadcastMutation = useTriggerBroadcastMutation();
  const downloadInvoiceMutation = useDownloadInvoiceMutation();
  const markReturnInTransitMutation = useMarkReturnInTransitMutation();
  const markReturnCompleteMutation = useMarkReturnCompleteMutation();
  const markRepairPickupInTransitMutation = useMarkRepairPickupInTransitMutation();
  const markRepairPickupDeliveredMutation = useMarkRepairPickupDeliveredToTailorMutation();
  const markRepairDeliveryInTransitMutation = useMarkRepairDeliveryInTransitMutation();
  const markRepairDeliveryCompleteMutation = useMarkRepairDeliveryCompleteMutation();

  // Return / repair-pickup / repair-delivery leg progression (Mark In Transit /
  // Mark Complete). The backend only lets the employee who accepted that leg
  // progress it (strict equality with the leg's employee id - there is NO admin
  // bypass; an admin's lever is reassigning the leg), so only that employee is
  // offered the buttons.
  const myUserId = String(user?.id ?? '');
  const isMyReturn =
    isEmployeeRole && !!order?.return_employee_id && String(order.return_employee_id) === myUserId;
  const isMyRepairPickup =
    isEmployeeRole &&
    !!order?.repair_pickup_employee_id &&
    String(order.repair_pickup_employee_id) === myUserId;
  const isMyRepairDelivery =
    isEmployeeRole &&
    !!order?.repair_delivery_employee_id &&
    String(order.repair_delivery_employee_id) === myUserId;

  // Tailor-assignment broadcast tracker - only meaningful to admins who manage
  // tailor search. Hidden from Bridge/employee, whose job is pickup/delivery,
  // not tailor assignment.
  const showBroadcastMonitor =
    isAdminRole && !!order && ['searching_tailor', 'broadcasted', 'tailor_assigned'].includes(order.status);
  const { data: broadcastStatus, isLoading: broadcastStatusLoading } = useOrderBroadcastStatus(
    order?.order_id ?? '',
    showBroadcastMonitor,
  );

  const { actions } = useOrderActions({ role, userId: user?.id, order });
  // Field roles (tailor / bridge) get their next step pinned to the bottom of the
  // screen; admins keep the full inline action list.
  const pinnedAction =
    isTailorRole || isEmployeeRole ? (actions.find((action) => action.tone === 'primary') ?? null) : null;

  const tailors = isAdminRole ? adminTailorsData?.tailors ?? adminTailorsData?.items ?? [] : employeeTailorsData ?? [];

  const handleAssign = (tailorId: string) => {
    if (!order) return;
    // Admin/superadmin use the unrestricted admin route; employees use the
    // employee-scoped route (requires the order to be claimed by them and a
    // measurement to already exist - employee_order_service.py's
    // employee_assign_tailor). Different backend preconditions, same UI action.
    const mutation = isAdminRole ? assignMutation : assignEmployeeMutation;
    mutation.mutate({ orderId: order.order_id, payload: { tailor_id: tailorId } }, { onSuccess: () => setAssignSheetVisible(false) });
  };

  const handleAssignDeliveryEmployee = (employeeId: string) => {
    if (!order) return;
    assignDeliveryEmployeeMutation.mutate(
      { orderId: order.order_id, payload: { employee_id: employeeId } },
      { onSuccess: () => setAssignDeliverySheetVisible(false) },
    );
  };

  const handleAssignReturnEmployee = (employeeId: string) => {
    if (!order) return;
    assignReturnEmployeeMutation.mutate(
      { orderId: order.order_id, payload: { employee_id: employeeId } },
      { onSuccess: () => setAssignReturnSheetVisible(false) },
    );
  };

  const handleAssignRepairPickupEmployee = (employeeId: string) => {
    if (!order) return;
    assignRepairPickupEmployeeMutation.mutate(
      { orderId: order.order_id, payload: { employee_id: employeeId } },
      { onSuccess: () => setAssignRepairPickupSheetVisible(false) },
    );
  };

  const handleAssignRepairDeliveryEmployee = (employeeId: string) => {
    if (!order) return;
    assignRepairDeliveryEmployeeMutation.mutate(
      { orderId: order.order_id, payload: { employee_id: employeeId } },
      { onSuccess: () => setAssignRepairDeliverySheetVisible(false) },
    );
  };

  const handleCorrectStatus = (status: OrderStatus) => {
    if (!order) return;
    statusMutation.mutate({ orderId: order.order_id, payload: { status } }, { onSuccess: () => setStatusSheetVisible(false) });
  };

  const handleActionPress = (action: OrderAction) => {
    switch (action.id) {
      case 'reject':
        setRejectSheetVisible(true);
        return;
      case 'refuse_delivery':
        setRefuseDeliverySheetVisible(true);
        return;
      case 'schedule_pickup':
        setSchedulePickupSheetVisible(true);
        return;
      case 'assign_tailor':
        setAssignSheetVisible(true);
        return;
      case 'update_measurement':
        setMeasurementManageSheetIsAdmin(true);
        setMeasurementTargetItem(order?.items.length === 1 ? { id: order.items[0].order_item_id ?? undefined } : null);
        setMeasurementManageSheetVisible(true);
        return;
      case 'manage_measurement':
        setMeasurementManageSheetIsAdmin(false);
        setMeasurementTargetItem(order?.items.length === 1 ? { id: order.items[0].order_item_id ?? undefined } : null);
        setMeasurementManageSheetVisible(true);
        return;
      case 'add_addon':
        setAddAddonTargetItem(
          order?.items.length === 1
            ? { id: order.items[0].order_item_id ?? undefined, serviceId: order.items[0].service_id ?? undefined }
            : null,
        );
        setAddAddonSheetVisible(true);
        return;
      case 'correct_status':
        setStatusSheetVisible(true);
        return;
      case 'cancel':
        setCancelSheetVisible(true);
        return;
      case 'collect_cod':
        setCollectSheetVisible(true);
        return;
      case 'view_payment':
        setPaymentSheetVisible(true);
        return;
      case 'in_progress':
        // Only this stitching-stage transition opens the optional-photo
        // sheet (see useOrderActions.ts's opensProgressSheet) - final_check
        // and every other stage fall through to the default direct-run path.
        if (action.requiresInput) {
          setUpdateProgressSheetVisible(true);
          return;
        }
        action.run();
        return;
      default:
        if (action.requiresConfirmation) {
          setConfirmAction(action);
        } else {
          action.run();
        }
    }
  };

  // Prompt the Bridge employee to fill the measurement right after they
  // confirm physical pickup - the natural moment to collect it, since
  // customers no longer provide their own measurement at all (product
  // change: measurement is only ever filled by Bridge/employee at pickup, or
  // by Admin). Fires once per order-status transition into picked_up, not on
  // every render/refetch of an order already at that stage.
  // Multi-item orders deliberately don't auto-prompt - which item to measure
  // first is ambiguous, so Bridge uses the Items & Measurements card instead.
  const promptedPickupMeasurementFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isEmployeeRole || !order) return;
    if (order.status !== ORDER_STATUS.PICKED_UP) return;
    if (order.items.length !== 1) return;
    if (order.items[0].has_measurement) return; // already has one on file
    if (promptedPickupMeasurementFor.current === order.order_id) return;
    promptedPickupMeasurementFor.current = order.order_id;
    setMeasurementManageSheetIsAdmin(false);
    setMeasurementTargetItem({ id: order.items[0].order_item_id ?? undefined });
    setMeasurementManageSheetVisible(true);
  }, [isEmployeeRole, order]);

  if (isLoading) return <Loader fullScreen message={t('orderDetail.loadingOrder')} />;
  if (isError || !order) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title={t('orderDetail.title')} showMenu={false} />
        <EmptyState
          title={isError ? t('orderDetail.failedToLoad') : t('orderDetail.notFound')}
          description={isError ? formatApiErrorDetail(error) : undefined}
          actionLabel={isError ? t('common.retry') : t('orderDetail.goBack')}
          onAction={isError ? () => refetch() : () => router.back()}
        />
      </View>
    );
  }

  const toneVariant: Record<OrderAction['tone'], 'primary' | 'outline' | 'danger'> = {
    primary: 'primary',
    secondary: 'outline',
    destructive: 'danger',
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={order.order_code ?? t('orderDetail.title')}
        subtitle={orderStatusLabel(order.status)}
        showMenu={false}
        rightAction={
          <View className="flex-row items-center gap-4">
            {!isTailorRole ? (
              <Pressable
                onPress={() => downloadInvoiceMutation.mutate({ orderId: order.order_id, orderCode: order.order_code })}
                disabled={downloadInvoiceMutation.isPending}
                hitSlop={8}
              >
                {downloadInvoiceMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="download-outline" size={22} color={colors.text} />
                )}
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={t('orderDetail.closeOrderDetails')}
            >
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      <ScreenContent showsVerticalScrollIndicator={false}>
        {pendingPickupOffer || pendingDeliveryOffer ? (
          <PendingOfferCard
            isPickup={pendingPickupOffer}
            accepting={acceptPickupMutation.isPending || acceptDeliveryMutation.isPending}
            onAccept={() =>
              pendingPickupOffer
                ? acceptPickupMutation.mutate(String(order.order_id))
                : acceptDeliveryMutation.mutate(String(order.order_id))
            }
          />
        ) : null}

        <View
          className="rounded-3xl border px-3 pt-4 pb-3 mb-4"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <OrderStepper status={order.status} />
        </View>

        <OrderSummaryCard order={order} isTailorRole={isTailorRole} />

        {!isTailorRole ? <OrderAddressCard order={order} /> : null}

        <OrderNotesCard order={order} isAdminRole={isAdminRole} onEdit={() => setNotesSheetVisible(true)} />

        <RepairRequestCard order={order} />

        {isTailorRole ? (
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/(drawer)/support/tickets/new',
                params: { orderId: order.order_id, category: 'order' },
              })
            }
            className="flex-row items-center rounded-2xl px-4 py-3 mb-4 border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primary} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {t('orderDetail.contactSupport')}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {t('orderDetail.contactSupportHint')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {isTailorRole ? (
          <Pressable
            onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE_NUMBER}`).catch(() => {})}
            className="flex-row items-center rounded-2xl px-4 py-3 mb-4 border"
            style={{ borderColor: colors.border, backgroundColor: colors.card }}
          >
            <Ionicons name="call-outline" size={18} color={colors.primary} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {t('orderDetail.callSupport')}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {t('orderDetail.callSupportHint')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {order.items.length <= 1 ? <OrderMeasurementCard order={order} isTailorRole={isTailorRole} /> : null}

        <ProgressPhotosSection orderId={order.order_id} orderStatus={order.status} isTailor={isTailorRole} />

        {isTailorRole && (order.status === ORDER_STATUS.TAILOR_ASSIGNED || order.status === ORDER_STATUS.PICKED_UP) ? (
          <View
            className="mb-4 flex-row items-start rounded-3xl p-4"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="time-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {t('orderDetail.waitingForClothTitle')}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {order.status === ORDER_STATUS.PICKED_UP
                  ? t('orderDetail.waitingForClothPickedUpHint')
                  : t('orderDetail.waitingForClothAssignedHint')}
              </Text>
            </View>
          </View>
        ) : null}

        {isEmployeeRole && order.status === ORDER_STATUS.READY_FOR_DISPATCH ? (
          <View
            className="mb-4 flex-row items-start rounded-3xl p-4"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="bicycle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {t('orderDetail.readyForDispatch')}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {t('orderDetail.readyForDispatchHint')}
              </Text>
              <Pressable onPress={() => router.push('/(drawer)/deliveries')} className="mt-2">
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                  {t('orderDetail.goToDeliveries')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {isEmployeeRole && order.status === ORDER_STATUS.RETURN_PENDING ? (
          <View
            className="mb-4 flex-row items-start rounded-3xl p-4"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="return-up-back-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {t('returns.returnOrder')}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                {t('returns.willReceiveOffers')}
              </Text>
              <Pressable onPress={() => router.push('/(drawer)/returns' as never)} className="mt-2">
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                  {t('returns.title')}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {isMyReturn && (order.status === ORDER_STATUS.RETURN_SCHEDULED || order.status === ORDER_STATUS.RETURN_IN_TRANSIT) ? (
          <View
            className="mb-4 rounded-3xl p-4"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <View className="flex-row items-start">
              <Ionicons name="return-up-back-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text className="text-sm font-semibold ml-2.5 flex-1" style={{ color: colors.text }}>
                {t('returns.acceptedBanner')}
              </Text>
            </View>
            <View className="flex-row mt-3" style={{ gap: 10 }}>
              {order.status === ORDER_STATUS.RETURN_SCHEDULED ? (
                <Button
                  title={t('returns.markInTransit')}
                  onPress={() => markReturnInTransitMutation.mutate(order.order_id)}
                  loading={markReturnInTransitMutation.isPending}
                  fullWidth
                />
              ) : (
                <Button
                  title={t('returns.markComplete')}
                  onPress={() => markReturnCompleteMutation.mutate(order.order_id)}
                  loading={markReturnCompleteMutation.isPending}
                  fullWidth
                />
              )}
            </View>
          </View>
        ) : null}

        {isMyRepairPickup &&
        (order.status === ORDER_STATUS.REPAIR_PICKUP_SCHEDULED || order.status === ORDER_STATUS.REPAIR_PICKUP_IN_TRANSIT) ? (
          <View className="mb-4 rounded-3xl p-4" style={{ backgroundColor: colors.primaryLight }}>
            <View className="flex-row items-start">
              <Ionicons name="construct-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text className="text-sm font-semibold ml-2.5 flex-1" style={{ color: colors.text }}>
                {t('repairPickups.acceptedBanner')}
              </Text>
            </View>
            <View className="flex-row mt-3" style={{ gap: 10 }}>
              {order.status === ORDER_STATUS.REPAIR_PICKUP_SCHEDULED ? (
                <Button
                  title={t('repairPickups.markInTransit')}
                  onPress={() => markRepairPickupInTransitMutation.mutate(order.order_id)}
                  loading={markRepairPickupInTransitMutation.isPending}
                  fullWidth
                />
              ) : (
                <Button
                  title={t('repairPickups.markDeliveredToTailor')}
                  onPress={() => markRepairPickupDeliveredMutation.mutate(order.order_id)}
                  loading={markRepairPickupDeliveredMutation.isPending}
                  fullWidth
                />
              )}
            </View>
          </View>
        ) : null}

        {isMyRepairDelivery &&
        (order.status === ORDER_STATUS.REPAIR_DELIVERY_SCHEDULED || order.status === ORDER_STATUS.REPAIR_DELIVERY_IN_TRANSIT) ? (
          <View className="mb-4 rounded-3xl p-4" style={{ backgroundColor: colors.primaryLight }}>
            <View className="flex-row items-start">
              <Ionicons name="construct-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
              <Text className="text-sm font-semibold ml-2.5 flex-1" style={{ color: colors.text }}>
                {t('repairDeliveries.acceptedBanner')}
              </Text>
            </View>
            <View className="flex-row mt-3" style={{ gap: 10 }}>
              {order.status === ORDER_STATUS.REPAIR_DELIVERY_SCHEDULED ? (
                <Button
                  title={t('repairDeliveries.markInTransit')}
                  onPress={() => markRepairDeliveryInTransitMutation.mutate(order.order_id)}
                  loading={markRepairDeliveryInTransitMutation.isPending}
                  fullWidth
                />
              ) : (
                <Button
                  title={t('repairDeliveries.markComplete')}
                  onPress={() => markRepairDeliveryCompleteMutation.mutate(order.order_id)}
                  loading={markRepairDeliveryCompleteMutation.isPending}
                  fullWidth
                />
              )}
            </View>
          </View>
        ) : null}

        {order.items.length > 1 ? (
          <OrderItemsCard
            order={order}
            canManageMeasurements={isEmployeeRole || isAdminRole}
            onManageMeasurement={(item) => {
              setMeasurementManageSheetIsAdmin(isAdminRole);
              setMeasurementTargetItem(item);
              setMeasurementManageSheetVisible(true);
            }}
            canAddAddon={isEmployeeRole}
            onAddAddon={(item) => {
              setAddAddonTargetItem(item);
              setAddAddonSheetVisible(true);
            }}
          />
        ) : null}

        {actions.filter((action) => !(pinnedAction && action.id === pinnedAction.id)).length > 0 ? (
          <>
            <Text className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1" style={{ color: colors.textMuted }}>
              {t('orderDetail.actions')}
            </Text>
            {actions
              .filter((action) => !(pinnedAction && action.id === pinnedAction.id))
              .filter((action) =>
                order.items.length > 1
                  ? action.id !== 'update_measurement' &&
                    action.id !== 'manage_measurement' &&
                    action.id !== 'add_addon'
                  : true,
              )
              .map((action) => (
                <View key={action.id} className="mb-3">
                  <Button
                    title={action.label}
                    variant={toneVariant[action.tone]}
                    loading={action.isLoading}
                    disabled={!!action.disabledReason}
                    onPress={() => handleActionPress(action)}
                    fullWidth
                  />
                  {action.disabledReason ? (
                    <Text className="text-xs mt-1.5 ml-1" style={{ color: colors.textMuted }}>
                      {action.disabledReason}
                    </Text>
                  ) : null}
                </View>
              ))}
          </>
        ) : null}

        {showBroadcastMonitor ? <BroadcastMonitorCard status={broadcastStatus} isLoading={broadcastStatusLoading} /> : null}

        {isAdminRole && ['order_placed', 'order_accepted', 'searching_tailor', 'broadcasted', 'tailor_assigned'].includes(order.status) ? (
          <AdminToolsSection onTriggerBroadcast={() => setBroadcastConfirmVisible(true)} triggering={triggerBroadcastMutation.isPending} />
        ) : null}

        {/* Pickup Bridge assignment is no longer a standalone always-visible
            button - it's now required as part of Schedule Pickup itself
            (SchedulePickupSheet) when nobody is assigned yet, matching the
            web admin panel's OrderFullDetailsPage.jsx exactly.

            Delivery assignment appears at READY_FOR_DISPATCH (unclaimed -
            the automatic broadcast found nobody) AND at OUT_FOR_DELIVERY
            (already claimed - the accepted employee has gone unresponsive
            and needs reassigning). Previously only the unclaimed case had
            any lever at all - once accepted, admin had no recovery path
            short of a direct DB fix if that employee stopped responding. */}
        {isStaffRole &&
        order.status === ORDER_STATUS.READY_FOR_DISPATCH &&
        !order.delivery_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.deliveryTitle')}
              variant="secondary"
              onPress={() => setAssignDeliverySheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}
        {isStaffRole &&
        order.status === ORDER_STATUS.OUT_FOR_DELIVERY &&
        !!order.delivery_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.deliveryReassignTitle')}
              variant="secondary"
              onPress={() => setAssignDeliverySheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}

        {/* Same override lever as delivery above, for the return leg - when
            no Bridge employee accepts the automatic return broadcast, staff
            previously had no way to force an assignment (only a deduped
            admin notification), matching the exact gap already fixed on
            the web admin panel's OrderFullDetailsPage.jsx. Reassignment
            (already-claimed case) is also available now, for the same
            unresponsive-employee reason as delivery above. */}
        {isStaffRole &&
        order.status === ORDER_STATUS.RETURN_PENDING &&
        !order.return_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.returnTitle')}
              variant="secondary"
              onPress={() => setAssignReturnSheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}
        {isStaffRole &&
        (order.status === ORDER_STATUS.RETURN_SCHEDULED || order.status === ORDER_STATUS.RETURN_IN_TRANSIT) &&
        !!order.return_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.returnReassignTitle')}
              variant="secondary"
              onPress={() => setAssignReturnSheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}

        {/* Repair-pickup/repair-delivery legs (customer<->tailor round trip
            for a reported post-delivery issue) previously had NO admin
            assignment lever at all, unlike every other Bridge leg - only
            the broadcast-accept paths ever wrote these columns. */}
        {isStaffRole &&
        order.status === ORDER_STATUS.REPAIR_PICKUP_PENDING &&
        !order.repair_pickup_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.repairPickupTitle')}
              variant="secondary"
              onPress={() => setAssignRepairPickupSheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}
        {isStaffRole &&
        (order.status === ORDER_STATUS.REPAIR_PICKUP_SCHEDULED ||
          order.status === ORDER_STATUS.REPAIR_PICKUP_IN_TRANSIT) &&
        !!order.repair_pickup_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.repairPickupReassignTitle')}
              variant="secondary"
              onPress={() => setAssignRepairPickupSheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}
        {isStaffRole &&
        order.status === ORDER_STATUS.REPAIR_DELIVERY_PENDING &&
        !order.repair_delivery_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.repairDeliveryTitle')}
              variant="secondary"
              onPress={() => setAssignRepairDeliverySheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}
        {isStaffRole &&
        (order.status === ORDER_STATUS.REPAIR_DELIVERY_SCHEDULED ||
          order.status === ORDER_STATUS.REPAIR_DELIVERY_IN_TRANSIT) &&
        !!order.repair_delivery_employee_id ? (
          <View className="mb-3">
            <Button
              title={t('assignBridgeEmployee.repairDeliveryReassignTitle')}
              variant="secondary"
              onPress={() => setAssignRepairDeliverySheetVisible(true)}
              fullWidth
            />
          </View>
        ) : null}
        <View className="mb-8" />
      </ScreenContent>

      {pinnedAction ? (
        <StickyActionBar
          label={pinnedAction.label}
          onPress={() => handleActionPress(pinnedAction)}
          loading={pinnedAction.isLoading}
          disabledReason={pinnedAction.disabledReason}
          hint={orderNextStepHint(normalizedRole, order.status) ?? undefined}
        />
      ) : null}

      <AssignTailorSheet visible={assignSheetVisible} onClose={() => setAssignSheetVisible(false)} tailors={tailors} onAssign={handleAssign} />
      <AssignBridgeEmployeeSheet
        visible={assignDeliverySheetVisible}
        onClose={() => setAssignDeliverySheetVisible(false)}
        title={t('assignBridgeEmployee.deliveryTitle')}
        employees={bridgeEmployees}
        onAssign={handleAssignDeliveryEmployee}
      />

      <AssignBridgeEmployeeSheet
        visible={assignReturnSheetVisible}
        onClose={() => setAssignReturnSheetVisible(false)}
        title={t('assignBridgeEmployee.returnTitle')}
        employees={bridgeEmployees}
        onAssign={handleAssignReturnEmployee}
      />

      <AssignBridgeEmployeeSheet
        visible={assignRepairPickupSheetVisible}
        onClose={() => setAssignRepairPickupSheetVisible(false)}
        title={t('assignBridgeEmployee.repairPickupTitle')}
        employees={bridgeEmployees}
        onAssign={handleAssignRepairPickupEmployee}
      />

      <AssignBridgeEmployeeSheet
        visible={assignRepairDeliverySheetVisible}
        onClose={() => setAssignRepairDeliverySheetVisible(false)}
        title={t('assignBridgeEmployee.repairDeliveryTitle')}
        employees={bridgeEmployees}
        onAssign={handleAssignRepairDeliveryEmployee}
      />

      <SchedulePickupSheet
        visible={schedulePickupSheetVisible}
        onClose={() => setSchedulePickupSheetVisible(false)}
        orderId={order.order_id}
        assignedEmployeeId={order.assigned_employee_id}
      />

      <CorrectStatusSheet
        visible={statusSheetVisible}
        onClose={() => setStatusSheetVisible(false)}
        onSelect={handleCorrectStatus}
        currentStatus={order.status}
        loading={statusMutation.isPending}
      />

      <RejectOrderSheet visible={rejectSheetVisible} onClose={() => setRejectSheetVisible(false)} orderId={order.order_id} />

      <RefuseDeliverySheet visible={refuseDeliverySheetVisible} onClose={() => setRefuseDeliverySheetVisible(false)} orderId={order.order_id} />

      <CancelOrderSheet visible={cancelSheetVisible} onClose={() => setCancelSheetVisible(false)} orderId={order.order_id} />

      <CollectPaymentSheet
        visible={collectSheetVisible}
        onClose={() => setCollectSheetVisible(false)}
        orderId={order.order_id}
        orderCode={order.order_code}
        remainingAmount={order.remaining_amount}
      />

      <PaymentDetailsSheet
        visible={paymentSheetVisible}
        onClose={() => setPaymentSheetVisible(false)}
        orderId={order.order_id}
        isAdminRole={isAdminRole}
        isSuperadmin={isSuperadmin}
        isStaffRole={isStaffRole}
      />

      <OrderNotesEditSheet visible={notesSheetVisible} onClose={() => setNotesSheetVisible(false)} order={order} />

      <ConfirmModal
        visible={!!confirmAction}
        title={confirmAction?.label ?? ''}
        message={t('orderDetail.confirmActionMessage', { action: confirmAction?.label.toLowerCase() ?? '' })}
        confirmLabel={confirmAction?.label}
        loading={confirmAction?.isLoading}
        onConfirm={() => {
          confirmAction?.run();
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <ConfirmModal
        visible={broadcastConfirmVisible}
        title={t('orderDetail.forceRestartBroadcast')}
        message={t('orderDetail.forceRestartBroadcastMessage')}
        confirmLabel={t('orderDetail.triggerBroadcast')}
        loading={triggerBroadcastMutation.isPending}
        onConfirm={() => {
          triggerBroadcastMutation.mutate(order.order_id);
          setBroadcastConfirmVisible(false);
        }}
        onCancel={() => setBroadcastConfirmVisible(false)}
      />

      <MeasurementManageSheet
        visible={measurementManageSheetVisible}
        onClose={() => {
          setMeasurementManageSheetVisible(false);
          setMeasurementTargetItem(null);
        }}
        orderId={order.order_id}
        customerId={order.customer_id}
        serviceLabel={order.service_name ?? order.category_name}
        useAdminEndpoint={measurementManageSheetIsAdmin}
        orderItemId={measurementTargetItem?.id}
        itemLabel={measurementTargetItem?.label}
      />

      <AddOrderAddonSheet
        visible={addAddonSheetVisible}
        onClose={() => {
          setAddAddonSheetVisible(false);
          setAddAddonTargetItem(null);
        }}
        orderId={order.order_id}
        serviceId={addAddonTargetItem?.serviceId ?? (order.items.length === 1 ? order.items[0]?.service_id ?? undefined : undefined)}
        orderItemId={addAddonTargetItem?.id}
        itemLabel={addAddonTargetItem?.label}
      />

      <UpdateProgressSheet
        visible={updateProgressSheetVisible}
        onClose={() => setUpdateProgressSheetVisible(false)}
        orderId={order.order_id}
        nextStage="in_progress"
        nextStageLabel={t('updateProgress.updateProgressTitle')}
      />
    </View>
  );
}
