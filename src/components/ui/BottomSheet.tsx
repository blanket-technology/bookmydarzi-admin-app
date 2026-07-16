import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) => {
  const { colors } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.overlay }}
        onPress={onClose}
      >
        <Pressable
          className="rounded-t-3xl px-5 pt-3 pb-8"
          style={{ backgroundColor: colors.surface }}
          onPress={(event) => event.stopPropagation()}
        >
          <View className="w-12 h-1 rounded-full self-center mb-4" style={{ backgroundColor: colors.border }} />
          <View className="flex-row items-center justify-between mb-4">
            {title ? (
              <Text className="text-lg font-bold" style={{ color: colors.text }}>
                {title}
              </Text>
            ) : (
              <View />
            )}
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};
