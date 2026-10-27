import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps } from 'react-native';
import { useIsAnySheetOpen } from '@/store/openSheetStore';

interface ScreenContentProps extends ScrollViewProps {
  children: ReactNode;
  /** Max width of the centered content column on wide/tablet screens. */
  maxWidth?: number;
  /**
   * Set false when the screen already wraps its own KeyboardAvoidingView
   * (e.g. AddStaffForm) - avoids a redundant nested KAV. Defaults to true
   * so every other screen with text inputs gets correct keyboard-avoidance
   * for free instead of needing to remember to add it individually.
   */
  avoidKeyboard?: boolean;
}

/**
 * Drop-in replacement for `<ScrollView className="px-5">` used across
 * detail/form screens. On phone widths it behaves identically (full width,
 * standard horizontal padding); on tablet (supportsTablet: true in
 * app.json) it caps content to a centered, readable column instead of
 * stretching forms/text edge-to-edge across the whole screen.
 */
export const ScreenContent = ({
  children,
  maxWidth = 640,
  avoidKeyboard = true,
  style,
  contentContainerStyle,
  scrollEnabled,
  ...props
}: ScreenContentProps) => {
  // Auto-disabled while any BottomSheet is open anywhere in the app (see
  // openSheetStore.ts) - RN's Modal doesn't reliably stop the screen behind
  // it from being dragged/scrolled, so without this the background content
  // stayed fully scrollable underneath an open sheet. A caller-supplied
  // scrollEnabled still wins if explicitly passed as false for its own
  // reason; it just can't force scrolling back ON while a sheet is open.
  const isAnySheetOpen = useIsAnySheetOpen();
  const effectiveScrollEnabled = scrollEnabled === false ? false : !isAnySheetOpen;

  const content = (
    <ScrollView
      style={[{ flex: 1 }, style]}
      contentContainerStyle={[{ alignItems: 'center' }, contentContainerStyle]}
      scrollEnabled={effectiveScrollEnabled}
      // Without this the first tap on a button while the keyboard is open only
      // dismisses the keyboard (forms needed two taps to submit).
      keyboardShouldPersistTaps="handled"
      {...props}
    >
      <View style={{ width: '100%', paddingHorizontal: 20, maxWidth }}>
        {children}
      </View>
    </ScrollView>
  );

  if (!avoidKeyboard) return content;

  return (
    // Android keyboard handling is already done at the OS level via
    // app.json's softwareKeyboardLayoutMode: "resize" - the window itself
    // shrinks to fit the keyboard, so KeyboardAvoidingView must do nothing
    // there (behavior={undefined} disables it). "height" mode double-applies
    // on top of that OS resize, which is what was squishing/hiding content
    // like message input bars behind the keyboard instead of showing them.
    // Uses inline style, not className - NativeWind's className compile
    // step has been unreliable on this app's current build (see
    // login.tsx's identical fix), and a zero-flex KeyboardAvoidingView here
    // would silently break keyboard-avoidance app-wide since this is the
    // shared wrapper most screens use.
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {content}
    </KeyboardAvoidingView>
  );
};
