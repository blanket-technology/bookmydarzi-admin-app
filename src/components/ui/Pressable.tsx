import * as Haptics from 'expo-haptics';
import { cssInterop } from 'nativewind';
import { forwardRef } from 'react';
import { Platform, Pressable as RNPressable, type GestureResponderEvent, type PressableProps as RNPressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'none';

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  /** Plain style only - unlike RN's Pressable, this does NOT accept the
   * `({ pressed }) => style` function form. This component already
   * animates press state itself (scale), so a caller reaching for the
   * pressed-callback pattern almost always means "I want press feedback"
   * - which pressScale/haptic already provide. A function slipped in here
   * previously (via an `as never` cast) went straight into an Animated
   * style array, where it's never invoked - the intended style silently
   * never applied. */
  style?: StyleProp<ViewStyle>;
  /** Scale factor applied on press-in, eased back to 1 on release.
   * 0.97 for large surfaces (cards, rows), 0.94 for small tappable icons -
   * a bigger surface moving as much as a small one reads as sluggish. */
  pressScale?: number;
  /** Haptic feedback fired on press-in. Defaults to 'light' - the same
   * weight iOS/Android system controls use for a plain tap, so it never
   * feels heavier than the OS's own chrome. Set 'none' for high-frequency
   * elements (list rows in a fast-scrolling feed) where haptics on every
   * tap would feel noisy rather than premium. */
  haptic?: HapticStyle;
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);
// Web only: without this, `className` on <Pressable> (w-11, grow, basis-*, rounded-*,
// ...) is dropped because the animated wrapper isn't a NativeWind-aware component.
if (Platform.OS === 'web') {
  cssInterop(AnimatedPressable, { className: 'style' });
}

const fireHaptic = (style: HapticStyle) => {
  if (style === 'none' || Platform.OS === 'web') return;
  switch (style) {
    case 'selection':
      Haptics.selectionAsync();
      return;
    case 'medium':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return;
    case 'heavy':
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      return;
    default:
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// Drop-in replacement for RN's Pressable - adds the two things that make
// tapping something feel "expensive" instead of inert: a quick scale-down
// on press (RN's bare Pressable gives zero visual feedback unless you wire
// android_ripple/opacity yourself) and a light haptic tick, matching what
// iOS/Android's own system controls do on every tap. Every tappable surface
// in the app (buttons, rows, cards, icons) should use this instead of the
// raw react-native Pressable.
export const Pressable = forwardRef<View, PressableProps>(
  ({ pressScale = 0.97, haptic = 'light', onPressIn, onPressOut, style, disabled, ...props }, ref) => {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    const handlePressIn = (event: GestureResponderEvent) => {
      if (!disabled) {
        scale.value = withTiming(pressScale, { duration: 80 });
        fireHaptic(haptic);
      }
      onPressIn?.(event);
    };

    const handlePressOut = (event: GestureResponderEvent) => {
      scale.value = withTiming(1, { duration: 120 });
      onPressOut?.(event);
    };

    // Runtime guard for the one case the narrowed type can't stop: a caller
    // reaching for `as any`/`as never` to force a function style through
    // anyway. Fails loud in dev instead of silently dropping the style.
    if (__DEV__ && typeof style === 'function') {
      console.error(
        '[Pressable] Received a function `style` prop - this component only accepts a plain style. ' +
          'Use pressScale/haptic for press feedback instead.',
      );
    }

    return (
      <AnimatedPressable
        ref={ref}
        // Screen readers get a role and the disabled state for every tappable
        // surface by default; callers can still override either.
        accessibilityRole={props.accessibilityRole ?? 'button'}
        accessibilityState={{ disabled: !!disabled, ...props.accessibilityState }}
        disabled={disabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[animatedStyle, typeof style === 'function' ? undefined : style]}
        {...props}
      />
    );
  },
);

Pressable.displayName = 'Pressable';
