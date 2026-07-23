import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import {
  Badge,
  EmptyState,
  FilterSheet,
  Header,
  SkeletonList,
} from '@/components/ui';
import { useChatSessions } from '@/features/chat/hooks/useChat';
import { useTheme } from '@/hooks/useTheme';
import type { ChatSession, ChatSessionStatus } from '@/types/chat';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Waiting for Agent', value: 'pending_human' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'AI Handling', value: 'ai_handling' },
  { label: 'Open', value: 'open' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const STATUS_LABELS: Record<ChatSessionStatus, string> = {
  open: 'Open',
  ai_handling: 'AI Handling',
  pending_human: 'Waiting for Agent',
  assigned: 'Assigned',
  resolved: 'Resolved',
  closed: 'Closed',
};

const STATUS_COLORS: Record<ChatSessionStatus, string> = {
  open: '#3b82f6',
  ai_handling: '#a855f7',
  pending_human: '#f97316',
  assigned: '#6366f1',
  resolved: '#22c55e',
  closed: '#94a3b8',
};

export default function ChatInboxScreen() {
  const { colors } = useTheme();
  const [status, setStatus] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);

  const params = useMemo(
    () => ({ status: status || undefined, limit: 50 }),
    [status],
  );
  const { data, isLoading, isError, error, refetch, isRefetching } = useChatSessions(params);

  const sessions = data?.sessions ?? [];

  const renderItem = ({ item }: { item: ChatSession }) => {
    const statusColor = STATUS_COLORS[item.status] ?? colors.primary;
    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/chat/${item.uuid}`)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-bold text-base" style={{ color: colors.text }}>
              Customer #{item.user_id}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.order_id ? `Order #${item.order_id}` : 'General support'}
            </Text>
            {item.assigned_agent_id ? (
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Assigned to agent #{item.assigned_agent_id}
              </Text>
            ) : null}
          </View>
          <Badge
            label={STATUS_LABELS[item.status] ?? item.status}
            backgroundColor={`${statusColor}20`}
            color={statusColor}
          />
        </View>
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {item.ai_handled ? 'AI assisted' : 'Human conversation'}
          </Text>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {formatDate(item.last_message_at ?? item.created_at ?? undefined)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Chat"
        subtitle={`${data?.count ?? sessions.length} conversations`}
        rightAction={
          <Pressable
            onPress={() => setFilterVisible(true)}
            className="w-10 h-10 rounded-xl items-center justify-center border"
            style={{ backgroundColor: colors.surface, borderColor: colors.border }}
          >
            <Ionicons name="filter" size={20} color={colors.text} />
          </Pressable>
        }
      />

      <View className="px-5 flex-1">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load conversations"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.uuid}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="chatbubbles-outline"
                title="No conversations"
                description="Support conversations will appear here"
              />
            }
          />
        )}
      </View>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Filter by Status"
        options={STATUS_OPTIONS}
        selectedValue={status}
        onSelect={setStatus}
      />
    </View>
  );
}
