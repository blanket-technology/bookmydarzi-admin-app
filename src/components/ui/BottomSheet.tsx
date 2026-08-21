import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Pass something that changes when the sheet swaps to a different
   * internal "screen" (e.g. a multi-step form's current step name). Resets
   * scroll to top on change - without this, switching from a step where the
   * user had scrolled/kept the keyboard open leaves the ScrollView at that
   * same offset, so the new step's content renders partly or fully
   * off-screen and the previous step's content stays visible underneath. */
  contentKey?: string | number;
}

export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  contentKey,
}: BottomSheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [contentKey]);

  // Unmounting when closed (rather than always rendering with visible=false)
  // stops the sheet's own content from being what briefly flashes on screen
  // before RN's Modal finishes tearing down on Android - the "previous
  // screen shows through" symptom. Modal's own visible prop still drives
  // the enter/exit animation; this just guarantees nothing lingers mounted
  // underneath it between opens.
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <RNPressable
        className="flex-1 justify-end"
        style={{ backgroundColor: colors.overlay }}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          // Android's Modal already resizes for the keyboard via
          // windowSoftInputMode - only iOS needs the manual offset here.
          keyboardVerticalOffset={0}
        >
          <RNPressable
            className="rounded-t-3xl px-5 pt-3 self-center w-full"
            style={{
              backgroundColor: colors.surface,
              maxWidth: 640,
              maxHeight: '88%',
              paddingBottom: Math.max(insets.bottom, 20),
            }}
            onPress={(event) => event.stopPropagation()}
          >
            <View className="w-12 h-1 rounded-full self-center mb-4" style={{ backgroundColor: colors.border }} />
            <View className="flex-row items-center justify-between mb-4">
              {title ? (
                <Text className="text-lg font-bold flex-1 mr-3" style={{ color: colors.text }} numberOfLines={1}>
                  {title}
                </Text>
              ) : (
                <View />
              )}
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
            >
              {children}
            </ScrollView>
          </RNPressable>
        </KeyboardAvoidingView>
      </RNPressable>
    </Modal>
  );
};
