import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable as RNPressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Pressable } from '@/components/ui/Pressable';
import { Toast } from '@/components/ui/Toast';
import { useTheme } from '@/hooks/useTheme';
import { useOpenSheetStore } from '@/store/openSheetStore';

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
  /** Pinned below the scrollable body, outside it - use this for the
   * primary submit/confirm button instead of putting it in `children`.
   * Without this, a sheet whose content is taller than the visible area
   * (maxHeight 88%) can leave its own submit button scrolled mostly or
   * fully out of view with no obvious way to reach it - the button renders,
   * it's just below the fold. A footer here is always visible regardless of
   * how much content sits above it. */
  footer?: ReactNode;
}

export const BottomSheet = ({
  visible,
  onClose,
  title,
  children,
  contentKey,
  footer,
}: BottomSheetProps) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  // A definite pixel cap: a percentage maxHeight resolves against an auto-height
  // parent and (on web) let the body shrink below its content, clipping text.
  const { height: windowHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const incrementOpenSheets = useOpenSheetStore((s) => s.increment);
  const decrementOpenSheets = useOpenSheetStore((s) => s.decrement);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [contentKey]);

  // Registers this sheet as "open" in the global counter for as long as
  // `visible` is true, so any screen's ScreenContent can disable its own
  // scroll while at least one sheet is open anywhere. Keyed on `visible`
  // itself (not mount/unmount) - callers keep <BottomSheet visible={x} />
  // present in JSX and just toggle the prop, so the component instance
  // persists across opens/closes; only its rendered OUTPUT becomes null
  // below (see that comment). RN's Modal does not reliably block the
  // background screen from being dragged/scrolled underneath it in every
  // case, so this is enforced explicitly. The cleanup fires whenever
  // `visible` flips back to false or the component unmounts outright
  // (navigate-away mid-open), so the count can never get stuck above zero.
  useEffect(() => {
    if (!visible) return undefined;
    incrementOpenSheets();
    return () => decrementOpenSheets();
  }, [visible, incrementOpenSheets, decrementOpenSheets]);

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
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          // Bug fix: app.json's softwareKeyboardLayoutMode was "pan" (the
          // OS shifts the whole screen up instead of resizing it), which
          // doesn't interact correctly with a Modal - the sheet's own
          // content, and the dimmed overlay behind it, could end up panned
          // independently of each other, leaving a gap where the previous
          // screen showed through and the sheet's footer/submit button
          // pushed off-screen under the keyboard. Switched to "resize" (see
          // app.json) so the window itself actually shrinks for the
          // keyboard - matches how the Modal + KeyboardAvoidingView
          // combination is meant to be used. "height" (not the previous
          // `undefined`/no-op) gives Android an explicit second layer of
          // avoidance on top of that OS-level resize, for RN/Expo versions
          // where the resize alone isn't quite enough on every device.
          keyboardVerticalOffset={0}
        >
          <RNPressable
            className="rounded-t-3xl px-5 pt-3 self-center w-full"
            style={{
              backgroundColor: colors.surface,
              maxWidth: 640,
              maxHeight: Math.round(windowHeight * 0.88),
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
              <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              ref={scrollRef}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1 }}
              style={footer ? { flexGrow: 0, flexShrink: 1 } : undefined}
              // iOS: lets RN automatically keep the focused TextInput above
              // the keyboard by adjusting this ScrollView's content insets,
              // on top of KeyboardAvoidingView pushing the whole sheet up -
              // without this a field near the bottom of a long form (e.g.
              // MeasurementManageSheet's Chest/Waist/Height rows) could stay
              // under the keyboard even after the sheet itself made room.
              automaticallyAdjustKeyboardInsets
            >
              {children}
            </ScrollView>
            {footer ? <View className="pt-3">{footer}</View> : null}
          </RNPressable>
        </KeyboardAvoidingView>
        {/* A native Modal draws above the root Toast, so toasts raised from inside a
            sheet (validation, save errors) would be invisible without this copy. */}
        <Toast />
      </RNPressable>
    </Modal>
  );
};
