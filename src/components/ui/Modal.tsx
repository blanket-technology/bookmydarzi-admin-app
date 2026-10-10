import { Ionicons } from '@expo/vector-icons';
import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal as RNModal, Platform, ScrollView, Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { Toast } from '@/components/ui/Toast';
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
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ backgroundColor: colors.overlay }}
      >
        <View className="flex-1 justify-center px-5">
          <View
            className="rounded-3xl p-5 self-center w-full"
            style={{ backgroundColor: colors.surface, maxWidth: 480, maxHeight: '88%' }}
          >
            <View className="flex-row items-center justify-between mb-4">
              {title ? (
                <Text className="text-lg font-bold flex-1 mr-3" style={{ color: colors.text }}>
                  {title}
                </Text>
              ) : (
                <View />
              )}
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            {/* Scrolls when the content is taller than the screen (keyboard open,
                large font scale) so the action buttons stay reachable. */}
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          </View>
        </View>
        <Toast />
      </KeyboardAvoidingView>
    </RNModal>
  );
};
