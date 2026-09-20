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
      className="flex-1"
      style={style}
      contentContainerStyle={[{ alignItems: 'center' }, contentContainerStyle]}
      scrollEnabled={effectiveScrollEnabled}
      {...props}
    >
      <View className="w-full px-5" style={{ maxWidth }}>
        {children}
      </View>
    </ScrollView>
  );

  if (!avoidKeyboard) return content;

  return (
    <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {content}
    </KeyboardAvoidingView>
  );
};
