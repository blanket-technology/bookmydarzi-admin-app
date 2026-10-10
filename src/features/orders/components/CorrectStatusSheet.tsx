import { useState } from 'react';
import { Text } from 'react-native';
import { BottomSheet, ConfirmModal, Pressable } from '@/components/ui';
import { ADMIN_CORRECTABLE_STATUS_OPTIONS, orderStatusLabel } from '@/constants/orderStatus';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { OrderStatus } from '@/types/orders';

// Correcting a status bypasses the normal workflow graph, and the list is long
// and scrollable - so a tap only selects, and the change happens after an
// explicit confirmation (and never twice while the request is in flight).
export const CorrectStatusSheet = ({
  visible,
  onClose,
  onSelect,
  currentStatus,
  loading = false,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (status: OrderStatus) => void;
  currentStatus?: string | null;
  loading?: boolean;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const [target, setTarget] = useState<OrderStatus | null>(null);

  const confirm = () => {
    if (!target || loading) return;
    const status = target;
    setTarget(null);
    onSelect(status);
  };

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} title={t('correctStatus.title')}>
        {ADMIN_CORRECTABLE_STATUS_OPTIONS.filter((option) => option.value !== currentStatus).map((option) => (
          <Pressable
            key={option.value}
            onPress={() => setTarget(option.value)}
            disabled={loading}
            accessibilityRole="button"
            className="py-3 border-b"
            style={{ borderColor: colors.border, opacity: loading ? 0.5 : 1 }}
          >
            <Text style={{ color: colors.text }}>{orderStatusLabel(option.value)}</Text>
          </Pressable>
        ))}
      </BottomSheet>
      <ConfirmModal
        visible={target !== null}
        title={t('correctStatus.confirmTitle')}
        message={t('correctStatus.confirmBody', { status: target ? orderStatusLabel(target) : '' })}
        confirmLabel={t('correctStatus.confirm')}
        loading={loading}
        onConfirm={confirm}
        onCancel={() => setTarget(null)}
      />
    </>
  );
};
