import { ScrollView, Text, View } from 'react-native';
import { BottomSheet, Button, DateField, Pressable } from '@/components/ui';
import { ORDER_STATUS_OPTIONS } from '@/constants/orderStatus';
import { ORDER_PAYMENT_STATUS_OPTIONS } from '@/constants/paymentStatus';
import { useTailors } from '@/features/tailors/hooks/useTailors';
import { useTheme } from '@/hooks/useTheme';

export interface OrdersFilters {
  status: string;
  paymentStatus: string;
  tailorId: string;
  dateFrom: string;
  dateTo: string;
}

interface OrdersFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: OrdersFilters;
  onApply: (filters: OrdersFilters) => void;
}

const Chip = ({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) => {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="px-3.5 py-2 rounded-full border mr-2 mb-2"
      style={{
        backgroundColor: selected ? colors.primary : colors.surface,
        borderColor: selected ? colors.primary : colors.border,
      }}
    >
      <Text
        className="text-sm font-medium"
        style={{ color: selected ? '#fff' : colors.text }}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const SectionLabel = ({ children }: { children: string }) => {
  const { colors } = useTheme();
  return (
    <Text
      className="text-xs font-semibold mb-2 mt-1 uppercase tracking-wide"
      style={{ color: colors.textMuted }}
    >
      {children}
    </Text>
  );
};

// Exposes every filter GET /admin/orders supports (admin.py:555-579:
// status, payment_status, tailor_id, date_from, date_to) — previously only
// status was reachable from the UI. Dates use the shared DateField calendar
// picker (same as Offers/Leave/Audit Log/Schedule Pickup) rather than free
// text - the backend accepts ISO 8601 so DateField's plain YYYY-MM-DD output
// parses directly with no conversion needed.
export const OrdersFilterSheet = ({
  visible,
  onClose,
  filters,
  onApply,
}: OrdersFilterSheetProps) => {
  const { colors } = useTheme();
  const { data: tailorsData } = useTailors(undefined, visible);
  const tailors = tailorsData?.tailors ?? tailorsData?.items ?? [];

  const setField = <K extends keyof OrdersFilters>(key: K, value: OrdersFilters[K]) =>
    onApply({ ...filters, [key]: value });

  const clearAll = () =>
    onApply({ status: '', paymentStatus: '', tailorId: '', dateFrom: '', dateTo: '' });

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Filter Orders">
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <SectionLabel>Status</SectionLabel>
        <View className="flex-row flex-wrap">
          <Chip
            label="All"
            selected={!filters.status}
            onPress={() => setField('status', '')}
          />
          {ORDER_STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.status === option.value}
              onPress={() => setField('status', option.value)}
            />
          ))}
        </View>

        <SectionLabel>Payment Status</SectionLabel>
        <View className="flex-row flex-wrap">
          <Chip
            label="All"
            selected={!filters.paymentStatus}
            onPress={() => setField('paymentStatus', '')}
          />
          {ORDER_PAYMENT_STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              selected={filters.paymentStatus === option.value}
              onPress={() => setField('paymentStatus', option.value)}
            />
          ))}
        </View>

        <SectionLabel>Tailor</SectionLabel>
        <View className="flex-row flex-wrap">
          <Chip
            label="All"
            selected={!filters.tailorId}
            onPress={() => setField('tailorId', '')}
          />
          {tailors.map((tailor) => (
            <Chip
              key={tailor.tailor_id}
              label={tailor.full_name ?? `Tailor #${tailor.tailor_id}`}
              selected={filters.tailorId === tailor.tailor_id}
              onPress={() => setField('tailorId', tailor.tailor_id)}
            />
          ))}
        </View>

        <SectionLabel>Date Range</SectionLabel>
        <View className="flex-row" style={{ gap: 12 }}>
          <View className="flex-1">
            <DateField
              value={filters.dateFrom || null}
              onChange={(d) => setField('dateFrom', d)}
              placeholder="From"
              maximumDate={filters.dateTo ? new Date(`${filters.dateTo}T00:00:00`) : undefined}
            />
          </View>
          <View className="flex-1">
            <DateField
              value={filters.dateTo || null}
              onChange={(d) => setField('dateTo', d)}
              placeholder="To"
              minimumDate={filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : undefined}
            />
          </View>
        </View>
      </ScrollView>

      <View className="flex-row mt-2" style={{ gap: 12 }}>
        <Pressable
          onPress={clearAll}
          className="flex-1 items-center justify-center rounded-2xl py-3.5 border"
          style={{ borderColor: colors.border }}
        >
          <Text className="font-semibold" style={{ color: colors.text }}>
            Clear All
          </Text>
        </Pressable>
        <View className="flex-1">
          <Button title="Done" onPress={onClose} fullWidth />
        </View>
      </View>
    </BottomSheet>
  );
};
