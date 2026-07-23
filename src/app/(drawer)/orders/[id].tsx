import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { z } from 'zod';
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
} from '@/components/ui';
import {
  ADMIN_CORRECTABLE_STATUS_OPTIONS,
  ORDER_STATUS_COLORS,
  orderStatusLabel,
} from '@/constants/orderStatus';
import {
  PAYMENT_STATUS_COLORS,
  PAYMENT_STATUS_OPTIONS,
  paymentStatusLabel,
} from '@/constants/paymentStatus';
import {
  useAssignTailorMutation,
  useCancelOrderMutation,
  useCollectPaymentMutation,
  useOrders,
  useRejectOrderMutation,
  useSchedulePickupMutation,
  useUpdateOrderMeasurementMutation,
  useUpdateOrderStatusMutation,
} from '@/features/orders/hooks/useOrders';
import { useOrderActions, type OrderAction } from '@/features/orders/hooks/useOrderActions';
import { ProgressPhotosSection } from '@/features/orders/components/ProgressPhotosSection';
import {
  useCreateRefundMutation,
  usePaymentByOrder,
  usePaymentRefunds,
  useUpdatePaymentStatusMutation,
} from '@/features/payments/hooks/usePayments';
import { useAuth } from '@/hooks/useAuth';
import { useTailors } from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';
import type { OrderStatus } from '@/types/orders';
import { capitalize, formatCurrency, formatDate, formatDateTime } from '@/utils/errors';

const measurementSchema = z.object({
  profile_name: z.string().min(2, 'Profile name is required'),
  chest: z.string().min(1, 'Chest measurement is required'),
  waist: z.string().min(1, 'Waist measurement is required'),
  hips: z.string().optional(),
  shoulder: z.string().optional(),
  sleeve_length: z.string().optional(),
  notes: z.string().optional(),
});

type MeasurementFormData = z.infer<typeof measurementSchema>;

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { user, selectedRole } = useAuth();
  const [assignSheetVisible, setAssignSheetVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [measurementSheetVisible, setMeasurementSheetVisible] = useState(false);
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

  // Capped at 50: useOrders routes tailors to GET /orders/my-orders, whose
  // `limit` query param is hard-capped at 50 server-side (422 above that).
  const { data, isLoading, isError } = useOrders({ page: 1, limit: 50 });
  const { data: tailorsData } = useTailors();
  const assignMutation = useAssignTailorMutation();
  const statusMutation = useUpdateOrderStatusMutation();
  const measurementMutation = useUpdateOrderMeasurementMutation();
  const rejectMutation = useRejectOrderMutation();
  const schedulePickupMutation = useSchedulePickupMutation();
  const cancelMutation = useCancelOrderMutation();
  const collectPaymentMutation = useCollectPaymentMutation();

  const role = user?.role ?? selectedRole ?? undefined;
  const normalizedRole = String(role ?? '').toLowerCase();
  const isSuperadmin = normalizedRole === 'superadmin';
  const isAdminRole = isSuperadmin || normalizedRole === 'admin';

  const {
    data: payment,
    isLoading: isPaymentLoading,
    isError: isPaymentError,
  } = usePaymentByOrder(id, paymentSheetVisible);
  const { data: refunds } = usePaymentRefunds(payment?.Id, paymentSheetVisible && isAdminRole);
  const updatePaymentStatusMutation = useUpdatePaymentStatusMutation(id);
  const createRefundMutation = useCreateRefundMutation(id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeasurementFormData>({
    resolver: zodResolver(measurementSchema),
    defaultValues: {
      profile_name: '',
      chest: '',
      waist: '',
      hips: '',
      shoulder: '',
      sleeve_length: '',
      notes: '',
    },
  });

  const order = useMemo(
    () => data?.orders?.find((item) => item.order_id === id),
    [data, id],
  );

  const { actions } = useOrderActions({ role, order });

  const tailors = tailorsData?.tailors ?? tailorsData?.items ?? [];

  const handleAssign = (tailorId: string) => {
    if (!order) return;
    assignMutation.mutate(
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
        },
      },
      { onSuccess: () => { setCorrectPaymentSheetVisible(false); setTxnId(''); } },
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

  const onSubmitMeasurement = (formData: MeasurementFormData) => {
    if (!order) return;
    measurementMutation.mutate(
      {
        orderId: order.order_id,
        payload: {
          profile_name: formData.profile_name,
          chest: Number(formData.chest),
          waist: Number(formData.waist),
          hips: formData.hips ? Number(formData.hips) : undefined,
          shoulder: formData.shoulder ? Number(formData.shoulder) : undefined,
          sleeve_length: formData.sleeve_length
            ? Number(formData.sleeve_length)
            : undefined,
          notes: formData.notes,
        },
      },
      {
        onSuccess: () => {
          setMeasurementSheetVisible(false);
          reset();
        },
      },
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
        setMeasurementSheetVisible(true);
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

  if (isLoading) return <Loader fullScreen message="Loading order..." />;
  if (isError || !order) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Order Details" showMenu={false} />
        <EmptyState
          title="Order not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const statusColor = ORDER_STATUS_COLORS[order.status] ?? colors.primary;

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
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
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

        <ProgressPhotosSection
          orderId={order.order_id}
          orderStatus={order.status}
          isTailor={normalizedRole === 'tailor'}
        />

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
        <View className="mb-8" />
      </ScrollView>

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
        visible={measurementSheetVisible}
        onClose={() => setMeasurementSheetVisible(false)}
        title="Update Measurement"
      >
        <Controller
          control={control}
          name="profile_name"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Profile Name"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.profile_name?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="chest"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Chest (inches)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.chest?.message}
              keyboardType="decimal-pad"
            />
          )}
        />
        <Controller
          control={control}
          name="waist"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Waist (inches)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.waist?.message}
              keyboardType="decimal-pad"
            />
          )}
        />
        <Controller
          control={control}
          name="hips"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Hips (inches)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />
        <Controller
          control={control}
          name="shoulder"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Shoulder (inches)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />
        <Controller
          control={control}
          name="sleeve_length"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Sleeve Length (inches)"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              keyboardType="decimal-pad"
            />
          )}
        />
        <Controller
          control={control}
          name="notes"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Notes"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              multiline
            />
          )}
        />
        <Button
          title="Save Measurement"
          onPress={handleSubmit(onSubmitMeasurement)}
          loading={measurementMutation.isPending}
          fullWidth
        />
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

            {isAdminRole && refunds && refunds.length > 0 ? (
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
