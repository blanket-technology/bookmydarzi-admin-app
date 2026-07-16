import { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { Button } from './Button';
import { Modal } from './Modal';
import { useTheme } from '@/hooks/useTheme';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal = ({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} onClose={onCancel} title={title}>
      <Text className="text-sm leading-5 mb-6" style={{ color: colors.textSecondary }}>
        {message}
      </Text>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <Button title={cancelLabel} variant="outline" onPress={onCancel} fullWidth />
        </View>
        <View className="flex-1">
          <Button title={confirmLabel} onPress={onConfirm} loading={loading} fullWidth />
        </View>
      </View>
    </Modal>
  );
};
