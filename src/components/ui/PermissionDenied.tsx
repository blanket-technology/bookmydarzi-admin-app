import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

interface PermissionDeniedProps {
  message?: string;
  onGoBack?: () => void;
}

export const PermissionDenied = ({
  message = "You don't have permission to access this section.",
  onGoBack,
}: PermissionDeniedProps) => {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8 py-16" style={{ backgroundColor: colors.background }}>
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name="lock-closed-outline" size={36} color={colors.error} />
      </View>
      <Text className="text-lg font-bold text-center" style={{ color: colors.text }}>
        Access Denied
      </Text>
      <Text className="text-sm text-center mt-2 leading-5" style={{ color: colors.textSecondary }}>
        {message}
      </Text>
      {onGoBack ? (
        <View className="mt-6 w-full max-w-xs">
          <Button title="Go Back" onPress={onGoBack} variant="outline" />
        </View>
      ) : null}
    </View>
  );
};
