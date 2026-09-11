import { type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps } from 'react-native';

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
  ...props
}: ScreenContentProps) => {
  const content = (
    <ScrollView
      className="flex-1"
      style={style}
      contentContainerStyle={[{ alignItems: 'center' }, contentContainerStyle]}
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
