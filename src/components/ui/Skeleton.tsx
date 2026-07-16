import { useEffect } from 'react';
import { View, type DimensionValue, type ViewProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';

interface SkeletonProps extends ViewProps {
  width?: number | string;
  height?: number;
  rounded?: number;
  className?: string;
}

export const Skeleton = ({
  width = '100%',
  height = 16,
  rounded = 12,
  className,
  style,
}: SkeletonProps) => {
  const { colors, isDark } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      className={className}
      style={[
        animatedStyle,
        {
          width: width as DimensionValue,
          height,
          borderRadius: rounded,
          backgroundColor: isDark ? colors.border : '#e2e8f0',
        },
        style,
      ]}
    />
  );
};

export const SkeletonCard = () => (
  <View className="mb-3">
    <Skeleton height={100} rounded={24} />
  </View>
);

export const SkeletonList = ({ count = 5 }: { count?: number }) => (
  <View>
    {Array.from({ length: count }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
);
