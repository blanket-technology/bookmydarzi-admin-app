import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Header,
  Input,
  Loader,
  ScreenContent,
} from '@/components/ui';
import {
  ADMIN_CORRECTABLE_STATUS_OPTIONS,
  ORDER_STATUS,
  ORDER_STATUS_COLORS,
  orderStatusLabel,
} from '@/constants/orderStatus';
import {
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_OPTIONS,
  paymentStatusLabel,
} from '@/constants/paymentStatus';
import {
  useAssignTailorEmployeeMutation,
  useAssignTailorMutation,
  useCancelOrderMutation,
  useCollectPaymentMutation,
  useDownloadInvoiceMutation,
  useOrder,
  useOrderBroadcastStatus,
  useRejectOrderMutation,
  useSchedulePickupMutation,
  useTriggerBroadcastMutation,
  useUpdateOrderNotesMutation,
  useUpdateOrderStatusMutation,
} from '@/features/orders/hooks/useOrders';
import { useOrderActions, type OrderAction } from '@/features/orders/hooks/useOrderActions';
import { usePickupBroadcastOffers, useAcceptPickupBroadcastMutation } from '@/features/pickups/hooks/usePickups';
import { useDeliveryBroadcastOffers, useAcceptDeliveryBroadcastMutation } from '@/features/deliveries/hooks/useDeliveries';
import { MeasurementManageSheet } from '@/features/orders/components/MeasurementManageSheet';
import { ProgressPhotosSection } from '@/features/orders/components/ProgressPhotosSection';
import {
  useCreateRefundMutation,
  usePaymentByOrder,
  usePaymentRefunds,
  useUpdatePaymentStatusMutation,
} from '@/features/payments/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { useTailors, useTailorsForEmployee } from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';
import type { OrderStatus } from '@/types/orders';
import { capitalize, formatApiErrorDetail, formatCurrency, formatDate, formatDateTime } from '@/utils/errors';

// Same UPI VPA the customer app's balance-payment QR uses
// (EXPO_PUBLIC_MERCHANT_UPI_ID in react_app/eas.json) - both apps' QR
// collections land in the same account. No QR library needed: a public
// QR-image-generation API renders the PNG directly from the UPI deep link.
const MERCHANT_UPI = process.env.EXPO_PUBLIC_MERCHANT_UPI_ID ?? 'blankettechnolo974972.rzp@raxis';

function buildUpiQrImageUri(upiId: string, amount: number, orderCode: string, qrSize: number): string {
  const upiLink =
    `upi://pay?pa=${encodeURIComponent(upiId)}` +
    `&pn=${encodeURIComponent('BookMyDarzi')}` +
    `&tr=${encodeURIComponent(orderCode)}` +
    `&am=${amount.toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent(`COD collection for order ${orderCode}`)}`;
  return (
    `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&margin=12&data=` +
    encodeURIComponent(upiLink)
  );
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const { user, selectedRole } = useAuth();
  const [assignSheetVisible, setAssignSheetVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [measurementManageSheetVisible, setMeasurementManageSheetVisible] = useState(false);
  const [measurementManageSheetIsAdmin, setMeasurementManageSheetIsAdmin] = useState(false);
  const [rejectSheetVisible, setRejectSheetVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [cancelSheetVisible, setCancelSheetVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [collectSheetVisible, setCollectSheetVisible] = useState(false);
  const [collectMethod, setCollectMethod] = useState<'qr' | 'cash'>('cash');
  const [collectAmount, setCollectAmount] = useState('');
  const [confirmAction, setConfirmAction] = useState<OrderAction | null>(null);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [correctPaymentSheetVisible, setCorrectPaymentSheetVisible] = useState(false);
  const [refundSheetVisible, setRefundSheetVisible] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [txnId, setTxnId] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [notesSheetVisible, setNotesSheetVisible] = useState(false);
  const [notesForm, setNotesForm] = useState({
    description: '',
    fabric_notes: '',
    customization_notes: '',
    cloth_details: '',
  });

  const role = user?.role ?? selectedRole ?? undefined;
  const normalizedRole = String(role ?? '').toLowerCase();
  const isSuperadmin = normalizedRole === 'superadmin';
  const isAdminRole = isSuperadmin || normalizedRole === 'admin';
  const isEmployeeRole = normalizedRole === 'employee';

  // If THIS employee has a pending pickup/delivery broadcast offer for this
  // order, surface an inline Accept card (FCFS - matches the broadcast
  // targeting). Reuses the same offer queries as the Pickups/Deliveries
  // screens; only runs for the employee role.
  const { data: pickupOffersData } = usePickupBroadcastOffers(isEmployeeRole);
  const { data: deliveryOffersData } = useDeliveryBroadcastOffers(isEmployeeRole);
  const acceptPickupMutation = useAcceptPickupBroadcastMutation();
  const acceptDeliveryMutation = useAcceptDeliveryBroadcastMutation();
  const pendingPickupOffer = (pickupOffersData?.broadcasts ?? []).some(
    (o) => String(o.order_id) === String(id),
  );
  const pendingDeliveryOffer = (deliveryOffersData?.broadcasts ?? []).some(
    (o) => String(o.order_id) === String(id),
  );
  // Payment/refund viewing (read-only) is ADMIN_STAFF_ROLES server-side
  // (includes EMPLOYEE) - see get_payment_by_order / get_refunds_for_payment
  // in app/services/payments/. Broader than isAdminRole, which is reserved
  // for admin-only actions (broadcast force-restart, order notes editing,
  // force-cancel).
  const isStaffRole = isAdminRole || normalizedRole === 'employee';

  const { data: order, isLoading, isError, error, refetch } = useOrder(id);
  // Admin/superadmin see the full tailor list (contact details, KYC urls);
  // employees see a stripped, PII-free list via a separate endpoint - see
  // GET /employee/tailors vs GET /admin/tailors.
  const { data: adminTailorsData } = useTailors(undefined, isAdminRole);
  const { data: employeeTailorsData } = useTailorsForEmployee(!isAdminRole);
  const assignMutation = useAssignTailorMutation();
  const assignEmployeeMutation = useAssignTailorEmployeeMutation();
  const statusMutation = useUpdateOrderStatusMutation();
  const rejectMutation = useRejectOrderMutation();
  const schedulePickupMutation = useSchedulePickupMutation();
  const cancelMutation = useCancelOrderMutation();
  const collectPaymentMutation = useCollectPaymentMutation();
  const updateNotesMutation = useUpdateOrderNotesMutation();
  const triggerBroadcastMutation = useTriggerBroadcastMutation();
  const downloadInvoiceMutation = useDownloadInvoiceMutation();
  const [broadcastConfirmVisible, setBroadcastConfirmVisible] = useState(false);
  // Tailor-assignment broadcast tracker - only meaningful to admins who manage
  // tailor search. Hidden from Bridge/employee, whose job is pickup/delivery,
  // not tailor assignment (they were seeing an irrelevant "Broadcast Monitor").
  const showBroadcastMonitor =
    isAdminRole &&
    !!order &&
    ['searching_tailor', 'broadcasted', 'tailor_assigned'].includes(order.status);
  const { data: broadcastStatus, isLoading: broadcastStatusLoading } = useOrderBroadcastStatus(
    order?.order_id ?? '',
    showBroadcastMonitor,
  );

  const {
    data: payment,
    isLoading: isPaymentLoading,
    isError: isPaymentError,
  } = usePaymentByOrder(id, paymentSheetVisible);
  const { data: refunds } = usePaymentRefunds(payment?.Id, paymentSheetVisible && isStaffRole);
  const updatePaymentStatusMutation = useUpdatePaymentStatusMutation(id);
  const createRefundMutation = useCreateRefundMutation(id);

  const { actions } = useOrderActions({ role, order });

  const tailors = isAdminRole
    ? adminTailorsData?.tailors ?? adminTailorsData?.items ?? []
    : employeeTailorsData ?? [];

  const handleAssign = (tailorId: string) => {
    if (!order) return;
    // Admin/superadmin use the unrestricted admin route; employees use the
    // employee-scoped route (requires the order to be claimed by them and a
    // measurement to already exist - app/services/orders/employee_order_service.py's
    // employee_assign_tailor). Different backend preconditions, same UI action.
    const mutation = isAdminRole ? assignMutation : assignEmployeeMutation;
    mutation.mutate(
      { orderId: order.order_id, payload: { tailor_id: tailorId } },
      { onSuccess: () => setAssignSheetVisible(false) },
    );
  };

  const handleCorrectStatus = (status: OrderStatus) => {
    if (!order) return;
    statusMutation.mutate(
      { orderId: order.order_id, payload: { status } },
      { onSuccess: () => setStatusSheetVisible(false) },
    );
  };

  const handleReject = () => {
    if (!order) return;
    rejectMutation.mutate(
      { orderId: order.order_id, payload: rejectReason ? { reason: rejectReason } : undefined },
      { onSuccess: () => { setRejectSheetVisible(false); setRejectReason(''); } },
    );
  };

  const handleSchedulePickup = () => {
    if (!order) return;
    schedulePickupMutation.mutate({ orderId: order.order_id, payload: undefined });
  };

  const handleCancel = () => {
    if (!order || !cancelReason.trim()) return;
    cancelMutation.mutate(
      { orderId: order.order_id, payload: { reason: cancelReason } },
      { onSuccess: () => { setCancelSheetVisible(false); setCancelReason(''); } },
    );
  };

  const handleCollectPayment = () => {
    if (!order) return;
    const amount = Number(collectAmount);
    if (!amount || amount <= 0) return;
    collectPaymentMutation.mutate(
      { orderId: order.order_id, payload: { method: collectMethod, amount } },
      { onSuccess: () => { setCollectSheetVisible(false); setCollectAmount(''); } },
    );
  };

  const handleCorrectPaymentStatus = (status: string) => {
    if (!payment) return;
    updatePaymentStatusMutation.mutate(
      {
        paymentId: String(payment.Id),
        payload: {
          status,
          transaction_id: status === 'success' ? txnId || undefined : undefined,
          failure_reason: status === 'failed' ? failureReason || undefined : undefined,
        },
      },
      {
        onSuccess: () => {
          setCorrectPaymentSheetVisible(false);
          setTxnId('');
          setFailureReason('');
        },
      },
    );
  };

  const handleRefund = () => {
    if (!payment) return;
    const amount = refundAmount ? Number(refundAmount) : undefined;
    createRefundMutation.mutate(
      { paymentId: String(payment.Id), payload: { amount, reason: refundReason || undefined } },
      { onSuccess: () => { setRefundSheetVisible(false); setRefundAmount(''); setRefundReason(''); } },
    );
  };

  const openNotesSheet = () => {
    setNotesForm({
      description: order?.description ?? '',
      fabric_notes: order?.fabric_notes ?? '',
      customization_notes: order?.customization_notes ?? '',
      cloth_details: order?.cloth_details ?? '',
    });
    setNotesSheetVisible(true);
  };

  const handleSaveNotes = () => {
    if (!order) return;
    updateNotesMutation.mutate(
      {
        orderId: order.order_id,
        payload: {
          description: notesForm.description || null,
          fabric_notes: notesForm.fabric_notes || null,
          customization_notes: notesForm.customization_notes || null,
          cloth_details: notesForm.cloth_details || null,
        },
      },
      { onSuccess: () => setNotesSheetVisible(false) },
    );
  };

  const handleActionPress = (action: OrderAction) => {
    switch (action.id) {
      case 'reject':
        setRejectSheetVisible(true);
        return;
      case 'schedule_pickup':
        handleSchedulePickup();
        return;
      case 'assign_tailor':
        setAssignSheetVisible(true);
        return;
      case 'update_measurement':
        setMeasurementManageSheetIsAdmin(true);
        setMeasurementManageSheetVisible(true);
        return;
      case 'manage_measurement':
        setMeasurementManageSheetIsAdmin(false);
        setMeasurementManageSheetVisible(true);
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
  const promptedPickupMeasurementFor = useRef<string | null>(null);
  useEffect(() => {
    if (!isEmployeeRole || !order) return;
    if (order.status !== ORDER_STATUS.PICKED_UP) return;
    if (order.measurement) return; // already has one on file
    if (promptedPickupMeasurementFor.current === order.order_id) return;
    promptedPickupMeasurementFor.current = order.order_id;
    setMeasurementManageSheetIsAdmin(false);
    setMeasurementManageSheetVisible(true);
  }, [isEmployeeRole, order]);

  if (isLoading) return <Loader fullScreen message="Loading order..." />;
  if (isError || !order) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Order Details" showMenu={false} />
        <EmptyState
          title={isError ? 'Failed to load order' : 'Order not found'}
          description={isError ? formatApiErrorDetail(error) : undefined}
          actionLabel={isError ? 'Retry' : 'Go Back'}
          onAction={isError ? () => refetch() : () => router.back()}
        />
      </View>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] ?? colors.primary;
  const hasOrderNotes = !!(
    order.description ||
    order.fabric_notes ||
    order.customization_notes ||
    order.cloth_details
  );

  const toneVariant: Record<OrderAction['tone'], 'primary' | 'outline' | 'danger'> = {
    primary: 'primary',
    secondary: 'outline',
    destructive: 'danger',
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={order.order_code ?? 'Order Details'}
        subtitle={orderStatusLabel(order.status)}
        showMenu={false}
        rightAction={
          <View className="flex-row items-center gap-4">
            <Pressable
              onPress={() =>
                downloadInvoiceMutation.mutate({ orderId: order.order_id, orderCode: order.order_code })
              }
              disabled={downloadInvoiceMutation.isPending}
              hitSlop={8}
            >
              {downloadInvoiceMutation.isPending ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Ionicons name="download-outline" size={22} color={colors.text} />
              )}
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
        }
      />

      <ScreenContent showsVerticalScrollIndicator={false}>
        {(pendingPickupOffer || pendingDeliveryOffer) ? (
          <Card className="mb-4" style={{ borderColor: colors.primary, borderWidth: 1.5 }}>
            <View className="flex-row items-center mb-2">
              <Ionicons
                name={pendingPickupOffer ? 'cube-outline' : 'bicycle-outline'}
                size={18}
                color={colors.primary}
              />
              <Text className="font-bold ml-2" style={{ color: colors.text }}>
                {pendingPickupOffer ? 'Pickup offer for you' : 'Delivery offer for you'}
              </Text>
            </View>
            <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              You have a pending {pendingPickupOffer ? 'pickup' : 'delivery'} offer for this order.
              Accept to claim it (first come, first served).
            </Text>
            <Pressable
              onPress={() =>
                pendingPickupOffer
                  ? acceptPickupMutation.mutate(String(order.order_id))
                  : acceptDeliveryMutation.mutate(String(order.order_id))
              }
              disabled={acceptPickupMutation.isPending || acceptDeliveryMutation.isPending}
              className="rounded-xl py-3 items-center"
              style={{
                backgroundColor: colors.primary,
                opacity: acceptPickupMutation.isPending || acceptDeliveryMutation.isPending ? 0.6 : 1,
              }}
            >
              <Text className="text-white font-semibold">
                {acceptPickupMutation.isPending || acceptDeliveryMutation.isPending
                  ? 'Accepting…'
                  : pendingPickupOffer
                    ? 'Accept Pickup'
                    : 'Accept Delivery'}
              </Text>
            </Pressable>
          </Card>
        ) : null}

        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <Badge
              label={orderStatusLabel(order.status)}
              backgroundColor={`${statusColor}20`}
              color={statusColor}
            />
            <Text className="text-xl font-bold" style={{ color: colors.primary }}>
              {formatCurrency(order.final_amount ?? order.amount)}
            </Text>
          </View>

          <DetailRow label="Customer" value={order.customer_name ?? '—'} colors={colors} />
          <DetailRow label="Mobile" value={order.customer_mobile ?? '—'} colors={colors} />
          <DetailRow label="Service" value={order.service_name ?? '—'} colors={colors} />
          <DetailRow label="Category" value={order.category_name ?? '—'} colors={colors} />
          <DetailRow label="Tailor" value={order.tailor_name ?? 'Unassigned'} colors={colors} />
          <DetailRow
            label="Payment"
            value={capitalize(order.payment_status ?? '—')}
            colors={colors}
          />
          {typeof order.remaining_amount === 'number' && order.remaining_amount > 0 && (
            <DetailRow
              label="Balance Due"
              value={formatCurrency(order.remaining_amount)}
              colors={colors}
            />
          )}
          <DetailRow
            label="Urgency"
            value={capitalize(order.urgency_level ?? '—')}
            colors={colors}
          />
          <DetailRow label="Created" value={formatDate(order.created_at)} colors={colors} />
          <DetailRow
            label="Expected Delivery"
            value={formatDate(order.expected_delivery_date)}
            colors={colors}
          />
        </Card>

        {hasOrderNotes || isAdminRole ? (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold" style={{ color: colors.text }}>
                Order Notes
              </Text>
              {isAdminRole ? (
                <Pressable onPress={openNotesSheet} hitSlop={8}>
                  <Ionicons name="create-outline" size={20} color={colors.primary} />
                </Pressable>
              ) : null}
            </View>
            {hasOrderNotes ? (
              <>
                {order.description ? (
                  <DetailRow label="Description" value={order.description} colors={colors} />
                ) : null}
                {order.fabric_notes ? (
                  <DetailRow label="Fabric Notes" value={order.fabric_notes} colors={colors} />
                ) : null}
                {order.customization_notes ? (
                  <DetailRow label="Customization" value={order.customization_notes} colors={colors} />
                ) : null}
                {order.cloth_details ? (
                  <DetailRow label="Cloth Details" value={order.cloth_details} colors={colors} />
                ) : null}
              </>
            ) : (
              <Text className="text-sm py-1" style={{ color: colors.textMuted }}>
                No notes added yet.
              </Text>
            )}
          </Card>
        ) : null}

        {order.measurement ? (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold" style={{ color: colors.text }}>
                Measurements
              </Text>
              <Text className="text-xs" style={{ color: colors.textMuted }}>
                {order.measurement.profile_name}
              </Text>
            </View>
            {order.measurement.chest != null ? (
              <DetailRow label="Chest" value={`${order.measurement.chest} in`} colors={colors} />
            ) : null}
            {order.measurement.waist != null ? (
              <DetailRow label="Waist" value={`${order.measurement.waist} in`} colors={colors} />
            ) : null}
            {order.measurement.hips != null ? (
              <DetailRow label="Hips" value={`${order.measurement.hips} in`} colors={colors} />
            ) : null}
            {order.measurement.shoulder != null ? (
              <DetailRow label="Shoulder" value={`${order.measurement.shoulder} in`} colors={colors} />
            ) : null}
            {order.measurement.neck != null ? (
              <DetailRow label="Neck" value={`${order.measurement.neck} in`} colors={colors} />
            ) : null}
            {order.measurement.sleeve_length != null ? (
              <DetailRow label="Sleeve Length" value={`${order.measurement.sleeve_length} in`} colors={colors} />
            ) : null}
            {order.measurement.inseam != null ? (
              <DetailRow label="Inseam" value={`${order.measurement.inseam} in`} colors={colors} />
            ) : null}
            {order.measurement.height != null ? (
              <DetailRow label="Height" value={`${order.measurement.height} in`} colors={colors} />
            ) : null}
            {order.measurement.fit_preference ? (
              <DetailRow label="Fit Preference" value={capitalize(order.measurement.fit_preference)} colors={colors} />
            ) : null}
            {order.measurement.notes ? (
              <DetailRow label="Notes" value={order.measurement.notes} colors={colors} />
            ) : null}
          </Card>
        ) : normalizedRole === 'tailor' ? (
          <Card className="mb-4">
            <Text className="font-bold mb-1" style={{ color: colors.text }}>
              Measurements
            </Text>
            <Text className="text-sm" style={{ color: colors.textMuted }}>
              Not collected yet — the assigned Bridge employee records these at pickup.
            </Text>
          </Card>
        ) : null}

        <ProgressPhotosSection
          orderId={order.order_id}
          orderStatus={order.status}
          isTailor={normalizedRole === 'tailor'}
        />

        {normalizedRole === 'employee' && order.status === ORDER_STATUS.READY_FOR_DISPATCH ? (
          <Card className="mb-4 flex-row items-start" style={{ backgroundColor: colors.primaryLight }}>
            <Ionicons name="bicycle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
            <View className="ml-2.5 flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                Ready for dispatch
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                This order is now waiting to be claimed on the Deliveries screen — go online there to
                receive it as a delivery offer.
              </Text>
              <Pressable onPress={() => router.push('/(drawer)/deliveries')} className="mt-2">
                <Text className="text-xs font-bold" style={{ color: colors.primary }}>
                  Go to Deliveries →
                </Text>
              </Pressable>
            </View>
          </Card>
        ) : null}

        {actions.length > 0 ? (
          <>
            <Text
              className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
              style={{ color: colors.textMuted }}
            >
              Actions
            </Text>
            {actions.map((action) => (
              <Button
                key={action.id}
                title={action.label}
                variant={toneVariant[action.tone]}
                loading={action.isLoading}
                onPress={() => handleActionPress(action)}
                className="mb-3"
                fullWidth
              />
            ))}
          </>
        ) : null}

        {showBroadcastMonitor ? (
          <Card className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="font-bold" style={{ color: colors.text }}>
                Broadcast Monitor
              </Text>
              {broadcastStatusLoading ? <ActivityIndicator size="small" color={colors.textMuted} /> : null}
            </View>
            {broadcastStatus && broadcastStatus.broadcasts.length > 0 ? (
              broadcastStatus.broadcasts.map((b, idx) => (
                <View
                  key={b.id}
                  className="flex-row items-center justify-between py-2.5"
                  style={
                    idx < broadcastStatus.broadcasts.length - 1
                      ? { borderBottomWidth: 1, borderColor: colors.border }
                      : undefined
                  }
                >
                  <View>
                    <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                      Tailor #{b.tailor_id} · Round {b.round}
                    </Text>
                    <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                      Notified {formatDate(b.notified_at ?? undefined)}
                      {b.responded_at ? ` · Responded ${formatDate(b.responded_at)}` : ''}
                    </Text>
                  </View>
                  <Badge
                    label={b.status}
                    backgroundColor={`${ORDER_STATUS_COLORS[b.status] ?? colors.primary}20`}
                    color={ORDER_STATUS_COLORS[b.status] ?? colors.primary}
                  />
                </View>
              ))
            ) : (
              <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                No broadcast attempts yet.
              </Text>
            )}
          </Card>
        ) : null}

        {isAdminRole ? (
          <View className="mt-2">
            <Text
              className="text-xs font-semibold uppercase tracking-wide mb-2 ml-1"
              style={{ color: colors.textMuted }}
            >
              Admin Tools
            </Text>
            <Pressable
              onPress={() => setBroadcastConfirmVisible(true)}
              disabled={triggerBroadcastMutation.isPending}
              className="flex-row items-center justify-center py-3 rounded-2xl border mb-3"
              style={{ borderColor: colors.border, opacity: triggerBroadcastMutation.isPending ? 0.6 : 1 }}
            >
              <Ionicons name="radio-outline" size={16} color={colors.textSecondary} />
              <Text className="ml-2 text-sm font-semibold" style={{ color: colors.textSecondary }}>
                {triggerBroadcastMutation.isPending ? 'Triggering…' : 'Force Restart Broadcast'}
              </Text>
            </Pressable>
          </View>
        ) : null}
        <View className="mb-8" />
      </ScreenContent>

      <BottomSheet
        visible={assignSheetVisible}
        onClose={() => setAssignSheetVisible(false)}
        title="Assign Tailor"
      >
        {tailors.map((tailor) => (
          <Pressable
            key={tailor.tailor_id}
            onPress={() => handleAssign(tailor.tailor_id)}
            className="py-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text className="font-semibold" style={{ color: colors.text }}>
              {tailor.full_name}
            </Text>
            <Text className="text-sm" style={{ color: colors.textSecondary }}>
              {tailor.specialization} · {tailor.is_available ? 'Available' : 'Busy'}
            </Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={statusSheetVisible}
        onClose={() => setStatusSheetVisible(false)}
        title="Correct Status"
      >
        {ADMIN_CORRECTABLE_STATUS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => handleCorrectStatus(option.value)}
            className="py-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text style={{ color: colors.text }}>{option.label}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={rejectSheetVisible}
        onClose={() => setRejectSheetVisible(false)}
        title="Reject Order"
      >
        <Input
          label="Reason (optional)"
          value={rejectReason}
          onChangeText={setRejectReason}
          multiline
        />
        <Button
          title="Reject Order"
          variant="danger"
          onPress={handleReject}
          loading={rejectMutation.isPending}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet
        visible={cancelSheetVisible}
        onClose={() => setCancelSheetVisible(false)}
        title="Cancel Order"
      >
        <Input
          label="Reason"
          value={cancelReason}
          onChangeText={setCancelReason}
          multiline
        />
        <Button
          title="Cancel Order"
          variant="danger"
          onPress={handleCancel}
          loading={cancelMutation.isPending}
          disabled={!cancelReason.trim()}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet
        visible={collectSheetVisible}
        onClose={() => setCollectSheetVisible(false)}
        title="Collect COD Payment"
      >
        <View className="flex-row gap-3 mb-4">
          <Pressable
            onPress={() => setCollectMethod('cash')}
            className="flex-1 py-3 rounded-xl border items-center"
            style={{
              borderColor: collectMethod === 'cash' ? colors.primary : colors.border,
              backgroundColor: collectMethod === 'cash' ? `${colors.primary}15` : colors.surface,
            }}
          >
            <Text style={{ color: colors.text }}>Cash</Text>
          </Pressable>
          <Pressable
            onPress={() => setCollectMethod('qr')}
            className="flex-1 py-3 rounded-xl border items-center"
            style={{
              borderColor: collectMethod === 'qr' ? colors.primary : colors.border,
              backgroundColor: collectMethod === 'qr' ? `${colors.primary}15` : colors.surface,
            }}
          >
            <Text style={{ color: colors.text }}>QR</Text>
          </Pressable>
        </View>
        <Input
          label="Amount Collected"
          value={collectAmount}
          onChangeText={setCollectAmount}
          keyboardType="decimal-pad"
        />
        {collectMethod === 'qr' ? (
          Number(collectAmount) > 0 ? (
            <View className="items-center mb-4">
              <Text className="text-xs mb-2 text-center" style={{ color: colors.textSecondary }}>
                Ask the customer to scan this QR with any UPI app
              </Text>
              <View
                className="rounded-2xl overflow-hidden border p-2"
                style={{ borderColor: colors.border, backgroundColor: '#fff' }}
              >
                <Image
                  source={{
                    uri: buildUpiQrImageUri(
                      MERCHANT_UPI,
                      Number(collectAmount),
                      order?.order_code ?? String(id ?? ''),
                      Math.min(screenWidth - 96, 240),
                    ),
                  }}
                  style={{
                    width: Math.min(screenWidth - 96, 240),
                    height: Math.min(screenWidth - 96, 240),
                  }}
                  resizeMode="contain"
                />
              </View>
              <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
                {MERCHANT_UPI}
              </Text>
            </View>
          ) : (
            <Text className="text-xs mb-4" style={{ color: colors.textMuted }}>
              Enter an amount above to generate the QR code.
            </Text>
          )
        ) : null}
        <Button
          title="Confirm Collection"
          onPress={handleCollectPayment}
          loading={collectPaymentMutation.isPending}
          disabled={!collectAmount || Number(collectAmount) <= 0}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet
        visible={paymentSheetVisible}
        onClose={() => setPaymentSheetVisible(false)}
        title="Payment Details"
      >
        {isPaymentLoading ? (
          <Loader message="Loading payment..." />
        ) : isPaymentError || !payment ? (
          <Text className="text-sm py-4" style={{ color: colors.textSecondary }}>
            No payment record found for this order yet.
          </Text>
        ) : (
          <>
            <View className="flex-row items-center justify-between mb-3">
              <Badge
                label={paymentStatusLabel(payment.Status)}
                backgroundColor={`${PAYMENT_STATUS_COLORS[payment.Status] ?? colors.primary}20`}
                color={PAYMENT_STATUS_COLORS[payment.Status] ?? colors.primary}
              />
              <Text className="text-lg font-bold" style={{ color: colors.primary }}>
                {formatCurrency(payment.Amount)}
              </Text>
            </View>
            <DetailRow label="Payment Code" value={payment.PaymentCode ?? '—'} colors={colors} />
            <DetailRow
              label="Type"
              value={capitalize(payment.PaymentType ?? 'booking')}
              colors={colors}
            />
            <DetailRow label="Method" value={capitalize(payment.Method ?? '—')} colors={colors} />
            <DetailRow
              label="Transaction ID"
              value={payment.TransactionId ?? '—'}
              colors={colors}
            />
            {payment.FailureReason ? (
              <DetailRow label="Failure Reason" value={payment.FailureReason} colors={colors} />
            ) : null}
            <DetailRow label="Created" value={formatDateTime(payment.CreatedAt)} colors={colors} />

            {isStaffRole && refunds && refunds.length > 0 ? (
              <View className="mt-4">
                <Text className="text-sm font-semibold mb-2" style={{ color: colors.text }}>
                  Refund History
                </Text>
                {refunds.map((refund) => (
                  <View
                    key={refund.id}
                    className="flex-row justify-between py-2 border-b"
                    style={{ borderColor: colors.border }}
                  >
                    <Text className="text-sm" style={{ color: colors.textSecondary }}>
                      {refund.refund_code ?? `#${refund.id}`} · {capitalize(refund.status)}
                    </Text>
                    <Text className="text-sm font-medium" style={{ color: colors.text }}>
                      {formatCurrency(refund.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {isAdminRole && payment.Status === 'success' ? (
              <Button
                title="Issue Refund"
                variant="danger"
                className="mt-4"
                onPress={() => setRefundSheetVisible(true)}
                fullWidth
              />
            ) : null}
            {isSuperadmin ? (
              <Button
                title="Correct Payment Status"
                variant="outline"
                className="mt-3"
                onPress={() => setCorrectPaymentSheetVisible(true)}
                fullWidth
              />
            ) : null}
          </>
        )}
      </BottomSheet>

      <BottomSheet
        visible={correctPaymentSheetVisible}
        onClose={() => setCorrectPaymentSheetVisible(false)}
        title="Correct Payment Status"
      >
        <Input
          label="Transaction ID (required for Success)"
          value={txnId}
          onChangeText={setTxnId}
        />
        <Input
          label="Failure Reason (used when marking Failed)"
          value={failureReason}
          onChangeText={setFailureReason}
          multiline
        />
        {PAYMENT_STATUS_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => handleCorrectPaymentStatus(option.value)}
            className="py-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text style={{ color: colors.text }}>{option.label}</Text>
          </Pressable>
        ))}
      </BottomSheet>

      <BottomSheet
        visible={refundSheetVisible}
        onClose={() => setRefundSheetVisible(false)}
        title="Issue Refund"
      >
        <Input
          label="Amount (leave blank for full refund)"
          value={refundAmount}
          onChangeText={setRefundAmount}
          keyboardType="decimal-pad"
        />
        <Input
          label="Reason (optional)"
          value={refundReason}
          onChangeText={setRefundReason}
          multiline
        />
        <Button
          title="Confirm Refund"
          variant="danger"
          onPress={handleRefund}
          loading={createRefundMutation.isPending}
          fullWidth
        />
      </BottomSheet>

      <BottomSheet
        visible={notesSheetVisible}
        onClose={() => setNotesSheetVisible(false)}
        title="Edit Order Notes"
      >
        <Input
          label="Description"
          value={notesForm.description}
          onChangeText={(text) => setNotesForm((f) => ({ ...f, description: text }))}
          multiline
        />
        <Input
          label="Fabric Notes"
          value={notesForm.fabric_notes}
          onChangeText={(text) => setNotesForm((f) => ({ ...f, fabric_notes: text }))}
          multiline
        />
        <Input
          label="Customization Notes"
          value={notesForm.customization_notes}
          onChangeText={(text) => setNotesForm((f) => ({ ...f, customization_notes: text }))}
          multiline
        />
        <Input
          label="Cloth Details"
          value={notesForm.cloth_details}
          onChangeText={(text) => setNotesForm((f) => ({ ...f, cloth_details: text }))}
          multiline
        />
        <Button
          title="Save Notes"
          onPress={handleSaveNotes}
          loading={updateNotesMutation.isPending}
          fullWidth
        />
      </BottomSheet>

      <ConfirmModal
        visible={!!confirmAction}
        title={confirmAction?.label ?? ''}
        message={`Are you sure you want to ${confirmAction?.label.toLowerCase()}?`}
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
        title="Force Restart Broadcast"
        message="This restarts tailor broadcast for this order regardless of its current status. Use this to recover a stuck order."
        confirmLabel="Trigger Broadcast"
        loading={triggerBroadcastMutation.isPending}
        onConfirm={() => {
          triggerBroadcastMutation.mutate(order.order_id);
          setBroadcastConfirmVisible(false);
        }}
        onCancel={() => setBroadcastConfirmVisible(false)}
      />

      <MeasurementManageSheet
        visible={measurementManageSheetVisible}
        onClose={() => setMeasurementManageSheetVisible(false)}
        orderId={order.order_id}
        customerId={order.customer_id}
        serviceLabel={order.service_name ?? order.category_name}
        useAdminEndpoint={measurementManageSheetIsAdmin}
      />
    </View>
  );
}

const DetailRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View
    className="flex-row justify-between py-2.5 border-b"
    style={{ borderColor: colors.border }}
  >
    <Text className="text-sm" style={{ color: colors.textSecondary }}>
      {label}
    </Text>
    <Text className="text-sm font-medium flex-1 text-right ml-4" style={{ color: colors.text }}>
      {value}
    </Text>
  </View>
);
