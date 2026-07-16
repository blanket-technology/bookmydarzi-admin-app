import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { useTheme } from '@/hooks/useTheme';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({
  icon = 'file-tray-outline',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) => {
  const { colors } = useTheme();

  return (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text className="text-lg font-bold text-center" style={{ color: colors.text }}>
        {title}
      </Text>
      {description ? (
        <Text
          className="text-sm text-center mt-2 leading-5"
          style={{ color: colors.textSecondary }}
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-6 w-full max-w-xs">
          <Button title={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
};
