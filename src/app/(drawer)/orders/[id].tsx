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
  EmptyState,
  Header,
  Input,
  Loader,
} from '@/components/ui';
import { ORDER_STATUS_COLORS, ORDER_STATUS_UPDATE_OPTIONS } from '@/constants/orderStatus';
import {
  useAssignTailorMutation,
  useOrders,
  useUpdateOrderMeasurementMutation,
  useUpdateOrderStatusMutation,
} from '@/features/orders/hooks/useOrders';
import { useTailors } from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';
import { capitalize, formatCurrency, formatDate } from '@/utils/errors';

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
  const [assignSheetVisible, setAssignSheetVisible] = useState(false);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const [measurementSheetVisible, setMeasurementSheetVisible] = useState(false);

  const { data, isLoading, isError } = useOrders({ page: 1, limit: 100 });
  const { data: tailorsData } = useTailors();
  const assignMutation = useAssignTailorMutation();
  const statusMutation = useUpdateOrderStatusMutation();
  const measurementMutation = useUpdateOrderMeasurementMutation();

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

  const tailors = tailorsData?.tailors ?? tailorsData?.items ?? [];

  const handleAssign = (tailorId: string) => {
    if (!order) return;
    assignMutation.mutate(
      { orderId: order.order_id, payload: { tailor_id: tailorId } },
      { onSuccess: () => setAssignSheetVisible(false) },
    );
  };

  const handleStatusUpdate = (status: string) => {
    if (!order) return;
    statusMutation.mutate(
      { orderId: order.order_id, payload: { status } },
      { onSuccess: () => setStatusSheetVisible(false) },
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

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={order.order_code ?? 'Order Details'}
        subtitle={capitalize(order.status)}
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
              label={capitalize(order.status)}
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

        <Button
          title="Assign Tailor"
          onPress={() => setAssignSheetVisible(true)}
          className="mb-3"
          fullWidth
        />
        <Button
          title="Update Measurement"
          variant="outline"
          onPress={() => setMeasurementSheetVisible(true)}
          className="mb-3"
          fullWidth
        />
        <Button
          title="Update Status"
          variant="outline"
          onPress={() => setStatusSheetVisible(true)}
          className="mb-8"
          fullWidth
        />
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
        title="Update Status"
      >
        {ORDER_STATUS_UPDATE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => handleStatusUpdate(option.value)}
            className="py-3 border-b"
            style={{ borderColor: colors.border }}
          >
            <Text style={{ color: colors.text }}>{option.label}</Text>
          </Pressable>
        ))}
      </BottomSheet>
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
