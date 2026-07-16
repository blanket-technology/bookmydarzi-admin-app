import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Modal as RNModal, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const Modal = ({ visible, onClose, title, children }: ModalProps) => {
  const { colors } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 justify-center px-5"
        style={{ backgroundColor: colors.overlay }}
      >
        <View
          className="rounded-3xl p-5"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center justify-between mb-4">
            {title ? (
              <Text className="text-lg font-bold" style={{ color: colors.text }}>
                {title}
              </Text>
            ) : (
              <View />
            )}
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </RNModal>
  );
};
