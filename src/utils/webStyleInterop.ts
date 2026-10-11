import { cssInterop } from 'nativewind';
import { Platform } from 'react-native';
import Animated from 'react-native-reanimated';

/**
 * On web, `className` on Reanimated components (Animated.View, Animated.Text...)
 * is dropped, so layout classes such as `flex-row items-center px-4` silently do
 * nothing and screens render with misplaced icons and stacked rows. Registering
 * them with NativeWind maps className -> style. Native builds already handle
 * these components, so this is intentionally web-only.
 */
if (Platform.OS === 'web') {
  const animated = Animated as unknown as Record<string, Parameters<typeof cssInterop>[0]>;
  for (const name of ['View', 'Text', 'ScrollView', 'FlatList', 'Image']) {
    if (animated[name]) cssInterop(animated[name], { className: 'style' });
  }
}
