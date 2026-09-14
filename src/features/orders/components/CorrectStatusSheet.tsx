import { Text } from 'react-native';
import { BottomSheet, Pressable } from '@/components/ui';
import { ADMIN_CORRECTABLE_STATUS_OPTIONS, orderStatusLabel } from '@/constants/orderStatus';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import type { OrderStatus } from '@/types/orders';

export const CorrectStatusSheet = ({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (status: OrderStatus) => void;
}) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={t('correctStatus.title')}>
      {ADMIN_CORRECTABLE_STATUS_OPTIONS.map((option) => (
        <Pressable key={option.value} onPress={() => onSelect(option.value)} className="py-3 border-b" style={{ borderColor: colors.border }}>
          <Text style={{ color: colors.text }}>{orderStatusLabel(option.value)}</Text>
        </Pressable>
      ))}
    </BottomSheet>
  );
};
