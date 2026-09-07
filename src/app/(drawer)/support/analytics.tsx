import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { RefreshControl, Text, View } from 'react-native';
import { Card, EmptyState, Header, Pressable, ScreenContent, SkeletonList, StatCard } from '@/components/ui';
import { useChatAnalytics } from '@/features/chat/hooks/useChat';
import { useTheme } from '@/hooks/useTheme';
import { formatApiErrorDetail } from '@/utils/errors';

// Web-only until now (final/src/features/chat's ChatSupportPage analytics
// tab) - GET /admin/chat/analytics returns a compact 24h stat summary, not a
// time series (no per-agent workload or volume-over-time breakdown exists
// on the backend), so this reuses StatCard/Card rather than ChartCard
// (bmdadmin has no charting library and nothing here is an array to plot).
export default function ChatAnalyticsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch, isRefetching } = useChatAnalytics();

  const periodLabel = data?.period === 'last_24h' ? 'Last 24 hours' : data?.period;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Chat Analytics"
        subtitle={periodLabel}
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

      {isLoading ? (
        <View className="px-5">
          <SkeletonList count={4} />
        </View>
      ) : isError ? (
        <EmptyState
          icon="cloud-offline-outline"
          title="Failed to load analytics"
          description={formatApiErrorDetail(error)}
          actionLabel="Retry"
          onAction={refetch}
        />
      ) : (
        <ScreenContent
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
          }
        >
          <View className="flex-row flex-wrap mt-1" style={{ gap: 12 }}>
            <StatCard
              title="Total Sessions"
              value={String(data?.total_sessions ?? 0)}
              icon="chatbubbles-outline"
              color="#3b82f6"
            />
            <StatCard
              title="AI Resolved"
              value={String(data?.ai_resolved ?? 0)}
              icon="sparkles-outline"
              color="#a855f7"
            />
            <StatCard
              title="AI Resolve Rate"
              value={`${data?.ai_resolve_rate ?? 0}%`}
              icon="trending-up-outline"
              color="#10b981"
            />
            <StatCard
              title="Avg. CSAT"
              value={data?.avg_csat != null ? data.avg_csat.toFixed(2) : '—'}
              icon="happy-outline"
              color="#f59e0b"
            />
          </View>

          <Card className="mb-8 mt-2">
            <View className="flex-row items-center mb-2">
              <Ionicons name="information-circle-outline" size={17} color={colors.textSecondary} />
              <Text className="text-sm font-semibold ml-2" style={{ color: colors.text }}>
                About this data
              </Text>
            </View>
            <Text className="text-sm leading-5" style={{ color: colors.textSecondary }}>
              These figures cover chat sessions started in the last 24 hours. AI Resolve Rate is the
              share of those sessions the AI assistant handled without needing a human agent. Avg. CSAT
              is the average customer satisfaction score across sessions where a rating was given.
            </Text>
          </Card>
        </ScreenContent>
      )}
    </View>
  );
}
