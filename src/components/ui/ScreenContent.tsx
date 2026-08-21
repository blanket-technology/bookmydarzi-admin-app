import { type ReactNode } from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';

interface ScreenContentProps extends ScrollViewProps {
  children: ReactNode;
  /** Max width of the centered content column on wide/tablet screens. */
  maxWidth?: number;
}

/**
 * Drop-in replacement for `<ScrollView className="px-5">` used across
 * detail/form screens. On phone widths it behaves identically (full width,
 * standard horizontal padding); on tablet (supportsTablet: true in
 * app.json) it caps content to a centered, readable column instead of
 * stretching forms/text edge-to-edge across the whole screen.
 */
export const ScreenContent = ({ children, maxWidth = 640, style, contentContainerStyle, ...props }: ScreenContentProps) => (
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
