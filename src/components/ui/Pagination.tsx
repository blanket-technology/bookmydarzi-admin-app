import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/hooks/useTheme';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => {
  const { colors } = useTheme();

  if (totalPages <= 1) return null;

  return (
    <View className="flex-row items-center justify-center py-4 gap-4">
      <Pressable
        disabled={page <= 1}
        onPress={() => onPageChange(page - 1)}
        pressScale={0.9}
        hitSlop={8}
        className="w-10 h-10 rounded-xl items-center justify-center border"
        style={{
          borderColor: colors.border,
          opacity: page <= 1 ? 0.4 : 1,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>
      <Text className="text-sm font-medium" style={{ color: colors.textSecondary }}>
        Page {page} of {totalPages}
      </Text>
      <Pressable
        disabled={page >= totalPages}
        onPress={() => onPageChange(page + 1)}
        pressScale={0.9}
        hitSlop={8}
        className="w-10 h-10 rounded-xl items-center justify-center border"
        style={{
          borderColor: colors.border,
          opacity: page >= totalPages ? 0.4 : 1,
          backgroundColor: colors.surface,
        }}
      >
        <Ionicons name="chevron-forward" size={20} color={colors.text} />
      </Pressable>
    </View>
  );
};
