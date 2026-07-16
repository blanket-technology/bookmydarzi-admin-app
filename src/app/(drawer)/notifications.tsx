import { View } from 'react-native';
import { EmptyState, Header } from '@/components/ui';
import { useTheme } from '@/hooks/useTheme';

export default function NotificationsScreen() {
  const { colors } = useTheme();

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Notifications" subtitle="Stay updated" />
      <EmptyState
        icon="notifications-outline"
        title="No notifications"
        description="New alerts from the admin dashboard will appear here"
      />
    </View>
  );
}
