import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, FilterSheet, Header, Pagination, Pressable, SkeletonList } from '@/components/ui';
import { useChatSessions, useMyAgentStatus, useSetAgentStatusMutation } from '@/features/chat/hooks/useChat';
import { useSupportTickets } from '@/features/support/hooks/useSupportTickets';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { ChatSession, ChatSessionStatus } from '@/types/chat';
import type { SupportTicketListItem, TicketStatus } from '@/types/support';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

// Single "Support" surface for staff — merges the two previously-separate
// drawer items (Chat = chat_v2 conversations, Support = legacy tickets)
// into one screen with tabs, so agents never have to check two inboxes for
// the same customer base. Both underlying systems/backends are unchanged;
// this is a navigation/presentation merge only.

const CHAT_STATUS_OPTIONS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Waiting for Agent', value: 'pending_human' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'AI Handling', value: 'ai_handling' },
  { label: 'Open', value: 'open' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const CHAT_STATUS_LABELS: Record<ChatSessionStatus, string> = {
  open: 'Open',
  ai_handling: 'AI Handling',
  pending_human: 'Waiting for Agent',
  assigned: 'Assigned',
  resolved: 'Resolved',
  closed: 'Closed',
};

const CHAT_STATUS_COLORS: Record<ChatSessionStatus, string> = {
  open: '#3b82f6',
  ai_handling: '#a855f7',
  pending_human: '#f97316',
  assigned: '#6366f1',
  resolved: '#22c55e',
  closed: '#94a3b8',
};

const PAGE_SIZE = 20;

function ConversationsTab() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [status]);

  // GET /admin/chat/sessions allows admin/superadmin/employee through its
  // role check but does NOT auto-scope by caller identity — without
  // agent_id, an employee sees every customer conversation in the system,
  // not just ones assigned to them. Force it to their own id, same
  // "auto-scope by role" pattern used for orders (useOrders.ts) and admins/
  // superadmins keep seeing everything (no forced agent_id).
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const scopedAgentId = normalizedRole === 'employee' && user?.id ? Number(user.id) : undefined;

  const params = useMemo(
    () => ({ status: status || undefined, limit: visibleCount, offset: 0, agent_id: scopedAgentId }),
    [status, visibleCount, scopedAgentId],
  );
  const { data, isLoading, isError, error, refetch, isRefetching } = useChatSessions(params);

  const sessions = data?.sessions ?? [];
  const hasMore = sessions.length >= visibleCount;

  const renderItem = ({ item }: { item: ChatSession }) => {
    const statusColor = CHAT_STATUS_COLORS[item.status] ?? colors.primary;
    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/support/chat/${item.uuid}`)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="font-bold text-base" style={{ color: colors.text }}>
                {item.customer_name ?? `Customer #${item.user_id}`}
              </Text>
              {!!item.unread_count && (
                <View
                  className="rounded-full items-center justify-center px-1.5"
                  style={{ backgroundColor: colors.primary, minWidth: 18, height: 18 }}
                >
                  <Text className="text-[10px] font-bold text-white">
                    {item.unread_count > 9 ? '9+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.order_id ? (item.order_code ?? `Order #${item.order_id}`) : 'General support'}
            </Text>
            {item.assigned_agent_id ? (
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                Assigned to agent #{item.assigned_agent_id}
              </Text>
            ) : null}
          </View>
          <Badge
            label={CHAT_STATUS_LABELS[item.status] ?? item.status}
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
    <View className="flex-1">
      <View className="px-5 pt-3 flex-row justify-end">
        <Pressable
          onPress={() => setFilterVisible(true)}
          className="w-10 h-10 rounded-xl items-center justify-center border"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Ionicons name="filter" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View className="px-5 flex-1 mt-2 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
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
            ListFooterComponent={
              hasMore ? (
                <Pressable
                  onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  disabled={isRefetching}
                  className="items-center justify-center py-4 flex-row gap-2"
                >
                  {isRefetching ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                      Load More
                    </Text>
                  )}
                </Pressable>
              ) : sessions.length > 0 ? (
                <Text className="text-center text-xs py-4" style={{ color: colors.textMuted }}>
                  No more conversations
                </Text>
              ) : null
            }
          />
        )}
      </View>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title="Filter by Status"
        options={CHAT_STATUS_OPTIONS}
        selectedValue={status}
        onSelect={setStatus}
      />
    </View>
  );
}

const TICKET_STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  open: { bg: '#fef3c7', color: '#d97706' },
  in_progress: { bg: '#FBF3DF', color: '#7D622A' },
  resolved: { bg: '#dcfce7', color: '#16a34a' },
  closed: { bg: '#f3f4f6', color: '#6b7280' },
};

const TICKET_STATUS_FILTERS: { label: string; value: TicketStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
];

const TICKET_LIMIT = 20;

function TicketsTab() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const isStaff = ['admin', 'superadmin', 'employee'].includes(normalizedRole);
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useSupportTickets({
    status: status || undefined,
    page,
    limit: TICKET_LIMIT,
  });

  const tickets = data?.tickets ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / TICKET_LIMIT));

  const renderItem = ({ item }: { item: SupportTicketListItem }) => {
    const badge = TICKET_STATUS_BADGE[item.status] ?? { bg: colors.surface, color: colors.textSecondary };
    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/support/tickets/${item.id}`)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="font-bold" style={{ color: colors.text }}>
              {item.subject}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {item.ticket_code ?? `#${item.id}`}
              {item.order_id ? ` · Order #${item.order_id}` : ''}
            </Text>
          </View>
          <Badge label={item.status.replace(/_/g, ' ')} backgroundColor={badge.bg} color={badge.color} />
        </View>
        <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
          {formatDate(item.created_at)}
        </Text>
      </Pressable>
    );
  };

  return (
    <View className="flex-1">
      <View className="px-5 pt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        {TICKET_STATUS_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className="px-3.5 py-2 rounded-full border"
            style={{
              backgroundColor: status === f.value ? colors.primary : colors.surface,
              borderColor: status === f.value ? colors.primary : colors.border,
            }}
          >
            <Text className="text-sm font-medium" style={{ color: status === f.value ? '#fff' : colors.text }}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="px-5 flex-1 mt-3 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load tickets"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="help-buoy-outline"
                title="No support tickets"
                description={isStaff ? 'No tickets have been raised yet.' : 'Tap + to raise a new ticket.'}
              />
            }
            ListFooterComponent={
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            }
          />
        )}
      </View>
    </View>
  );
}

type SupportTab = 'conversations' | 'tickets';

// Going online is what makes get_and_assign_available_agent() consider this
// user for new/escalated chats - without it, sessions queue forever with
// "Connecting to agent…" on the customer side and no agent ever sees them.
function AgentPresenceToggle() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data, isLoading } = useMyAgentStatus(!!user?.id);
  const { mutate, isPending } = useSetAgentStatusMutation();

  const isOnline = data?.status === 'online';
  const busy = isLoading || isPending;

  return (
    <Pressable
      onPress={() => {
        if (!user?.id || busy) return;
        mutate({ agentId: Number(user.id), status: isOnline ? 'offline' : 'online' });
      }}
      disabled={busy}
      className="flex-row items-center gap-2 mx-5 mt-3 px-3.5 py-2.5 rounded-2xl border"
      style={{
        backgroundColor: isOnline ? '#dcfce7' : colors.surface,
        borderColor: isOnline ? '#86efac' : colors.border,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <View
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: isOnline ? '#22c55e' : colors.textMuted }}
      />
      <Text
        className="text-xs font-semibold flex-1"
        style={{ color: isOnline ? '#15803d' : colors.textSecondary }}
      >
        {isLoading
          ? 'Checking status…'
          : isPending
            ? 'Updating…'
            : isOnline
              ? "You're online — receiving chats"
              : "You're offline — go online to receive chats"}
      </Text>
    </Pressable>
  );
}

export default function SupportScreen() {
  const { colors } = useTheme();
  const { permissions } = usePermissions();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  // Tailors are blocked server-side from chat_v2 entirely (_STAFF_ROLES /
  // _get_authorized_session in chat_v2.py) - the tab bar itself is hidden
  // for them rather than showing a tab that always errors.
  const canSeeConversations = permissions.chat;
  // Support tickets have no per-ticket assignee/owner on the backend at all
  // (app/services/support/*.py: any staff role sees and replies to every
  // ticket, by design) - there's no way to scope this to "my tickets" for
  // an employee, so rather than show them every customer's ticket, hide the
  // tab entirely. Admin/superadmin still see it (that's the actual
  // "everyone's tickets" audience this system was built for).
  const canSeeTickets = normalizedRole !== 'employee';
  const showTabSwitcher = canSeeConversations && canSeeTickets;
  const [tab, setTab] = useState<SupportTab>(canSeeConversations ? 'conversations' : 'tickets');

  const activeTab: SupportTab = canSeeConversations
    ? canSeeTickets
      ? tab
      : 'conversations'
    : 'tickets';

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Support"
        rightAction={
          activeTab === 'tickets' ? (
            <Pressable
              onPress={() => router.push('/(drawer)/support/tickets/new')}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-white text-xl font-bold">+</Text>
            </Pressable>
          ) : undefined
        }
      />

      {canSeeConversations && activeTab === 'conversations' && <AgentPresenceToggle />}

      {showTabSwitcher && (
        <View className="flex-row px-5 pt-3 gap-2">
          <Pressable
            onPress={() => setTab('conversations')}
            className="flex-1 py-2.5 rounded-xl items-center border"
            style={{
              backgroundColor: activeTab === 'conversations' ? colors.primary : colors.surface,
              borderColor: activeTab === 'conversations' ? colors.primary : colors.border,
            }}
          >
            <Text
              className="text-sm font-semibold"
              style={{ color: activeTab === 'conversations' ? '#ffffff' : colors.text }}
            >
              Conversations
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('tickets')}
            className="flex-1 py-2.5 rounded-xl items-center border"
            style={{
              backgroundColor: activeTab === 'tickets' ? colors.primary : colors.surface,
              borderColor: activeTab === 'tickets' ? colors.primary : colors.border,
            }}
          >
            <Text className="text-sm font-semibold" style={{ color: activeTab === 'tickets' ? '#ffffff' : colors.text }}>
              Tickets
            </Text>
          </Pressable>
        </View>
      )}

      {activeTab === 'conversations' ? <ConversationsTab /> : <TicketsTab />}
    </View>
  );
}
