import { View } from 'react-native';
import { Header } from '@/components/ui';
import { AdminReviewsPanel } from '@/features/reviews/components/AdminReviewsPanel';
import { useTheme } from '@/hooks/useTheme';

export default function ReviewsScreen() {
  const { colors } = useTheme();
  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Reviews" subtitle="Moderate customer reviews" />
      <AdminReviewsPanel />
    </View>
  );
}
