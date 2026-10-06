import { ScrollView, Text, View } from 'react-native';
import { BottomSheet, Button, DateField, Pressable } from '@/components/ui';
import { ORDER_STATUS_OPTIONS, orderStatusLabel } from '@/constants/orderStatus';
import { ORDER_PAYMENT_STATUS_OPTIONS } from '@/constants/paymentStatus';
import { useTailors } from '@/features/tailors/hooks/useTailors';
import { useAppLanguage } from '@/hooks/useAppLanguage';
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
  /** Payment-status/Tailor/Date-range are admin+employee concepts - a tailor
   * only ever queries GET /orders/my-orders, which doesn't accept any of
   * them (see useOrders.ts), and the Tailor section specifically would
   * otherwise call the admin-only GET /admin/tailors for a tailor caller.
   * Defaults true so every existing (admin/employee) call site keeps its
   * current behavior unless it opts out. */
  showAdminFilters?: boolean;
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
  showAdminFilters = true,
}: OrdersFilterSheetProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { data: tailorsData } = useTailors(undefined, visible && showAdminFilters);
  const tailors = tailorsData?.tailors ?? tailorsData?.items ?? [];

  const setField = <K extends keyof OrdersFilters>(key: K, value: OrdersFilters[K]) =>
    onApply({ ...filters, [key]: value });

  const clearAll = () =>
    onApply({ status: '', paymentStatus: '', tailorId: '', dateFrom: '', dateTo: '' });

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('ordersFilter.title')}
      footer={
        <View className="flex-row" style={{ gap: 12 }}>
          <Pressable
            onPress={clearAll}
            className="flex-1 items-center justify-center rounded-2xl py-3.5 border"
            style={{ borderColor: colors.border }}
          >
            <Text className="font-semibold" style={{ color: colors.text }}>
              {t('ordersFilter.clearAll')}
            </Text>
          </Pressable>
          <View className="flex-1">
            <Button title={t('ordersFilter.done')} onPress={onClose} fullWidth />
          </View>
        </View>
      }
    >
      <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
        <SectionLabel>{t('ordersFilter.status')}</SectionLabel>
        <View className="flex-row flex-wrap">
          <Chip
            label={t('common.all')}
            selected={!filters.status}
            onPress={() => setField('status', '')}
          />
          {ORDER_STATUS_OPTIONS.map((option) => (
            <Chip
              key={option.value}
              label={orderStatusLabel(option.value)}
              selected={filters.status === option.value}
              onPress={() => setField('status', option.value)}
            />
          ))}
        </View>

        {showAdminFilters ? (
          <>
            <SectionLabel>{t('ordersFilter.paymentStatus')}</SectionLabel>
            <View className="flex-row flex-wrap">
              <Chip
                label={t('common.all')}
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

            <SectionLabel>{t('ordersFilter.tailor')}</SectionLabel>
            <View className="flex-row flex-wrap">
              <Chip
                label={t('common.all')}
                selected={!filters.tailorId}
                onPress={() => setField('tailorId', '')}
              />
              {tailors.map((tailor) => (
                <Chip
                  key={tailor.tailor_id}
                  label={tailor.full_name ?? t('ordersFilter.tailorHash', { id: tailor.tailor_id })}
                  selected={filters.tailorId === tailor.tailor_id}
                  onPress={() => setField('tailorId', tailor.tailor_id)}
                />
              ))}
            </View>

            <SectionLabel>{t('ordersFilter.dateRange')}</SectionLabel>
            <View className="flex-row" style={{ gap: 12 }}>
              <View className="flex-1">
                <DateField
                  value={filters.dateFrom || null}
                  onChange={(d) => setField('dateFrom', d)}
                  placeholder={t('ordersFilter.from')}
                  maximumDate={filters.dateTo ? new Date(`${filters.dateTo}T00:00:00`) : undefined}
                />
              </View>
              <View className="flex-1">
                <DateField
                  value={filters.dateTo || null}
                  onChange={(d) => setField('dateTo', d)}
                  placeholder={t('ordersFilter.to')}
                  minimumDate={filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : undefined}
                />
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </BottomSheet>
  );
};
