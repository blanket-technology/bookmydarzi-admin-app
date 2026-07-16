import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

interface LoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const Loader = ({ message = 'Loading...', fullScreen = false }: LoaderProps) => {
  const { colors } = useTheme();

  return (
    <View
      className={`items-center justify-center ${fullScreen ? 'flex-1' : 'py-12'}`}
      style={fullScreen ? { flex: 1, backgroundColor: colors.background } : undefined}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      {message ? (
        <Text className="text-sm mt-3" style={{ color: colors.textSecondary }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
};
