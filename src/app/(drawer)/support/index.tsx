import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, EmptyState, FilterSheet, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { useChatSessions, useMyAgentStatus, useSetAgentStatusMutation } from '@/features/chat/hooks/useChat';
import { RequestCallbackScreen } from '@/features/support/components/RequestCallbackScreen';
import { useSupportTickets } from '@/features/support/hooks/useSupportTickets';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/hooks/useAppLanguage';
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

const CHAT_STATUS_OPTIONS: { labelKey: string; value: string }[] = [
  { labelKey: 'common.all', value: '' },
  { labelKey: 'support.waitingForAgent', value: 'pending_human' },
  { labelKey: 'support.assigned', value: 'assigned' },
  { labelKey: 'support.aiHandling', value: 'ai_handling' },
  { labelKey: 'support.open', value: 'open' },
  { labelKey: 'support.resolved', value: 'resolved' },
  { labelKey: 'support.closed', value: 'closed' },
];

const CHAT_STATUS_LABEL_KEYS: Record<ChatSessionStatus, string> = {
  open: 'support.open',
  ai_handling: 'support.aiHandling',
  pending_human: 'support.waitingForAgent',
  assigned: 'support.assigned',
  resolved: 'support.resolved',
  closed: 'support.closed',
};

const CHAT_STATUS_COLORS: Record<ChatSessionStatus, string> = {
  open: '#3b82f6',
  ai_handling: '#a855f7',
  pending_human: '#f97316',
  assigned: '#6366f1',
  resolved: '#22c55e',
  closed: '#94a3b8',
};

const MAX_VISIBLE = 100;
const PAGE_SIZE = 20;

function ConversationsTab() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
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

  // GET /admin/chat/sessions has no `search` param on the backend
  // (chat_v2.py:admin_list_sessions) - filter client-side over the fetched
  // page rather than silently ignoring the search box or waiting on a
  // backend change.
  const allSessions = data?.sessions ?? [];
  const sessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allSessions;
    return allSessions.filter(
      (s) =>
        (s.customer_name ?? '').toLowerCase().includes(q) ||
        (s.order_code ?? '').toLowerCase().includes(q) ||
        String(s.order_id ?? '').includes(q) ||
        String(s.user_id).includes(q),
    );
  }, [allSessions, search]);
  // The backend caps `limit` at 100 (a larger value is a 422 that blanks the list).
  const hasMore = allSessions.length >= visibleCount && visibleCount < MAX_VISIBLE;

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
                {item.customer_name ?? t('support.customerHash', { id: item.user_id })}
              </Text>
              {!!item.unread_count && (
                <View
                  className="rounded-full items-center justify-center px-1.5"
                  style={{ backgroundColor: colors.primary, minWidth: 18, height: 18 }}
                >
                  <Text className="text-[10px] font-bold" style={{ color: colors.onPrimary }}>
                    {item.unread_count > 9 ? '9+' : item.unread_count}
                  </Text>
                </View>
              )}
            </View>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.order_id ? (item.order_code ?? t('pickups.orderHash', { id: item.order_id })) : t('support.generalSupport')}
            </Text>
            {item.assigned_agent_id ? (
              <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
                {t('support.assignedToAgent', { id: item.assigned_agent_id })}
              </Text>
            ) : null}
          </View>
          <Badge
            label={CHAT_STATUS_LABEL_KEYS[item.status] ? t(CHAT_STATUS_LABEL_KEYS[item.status]) : item.status}
            backgroundColor={`${statusColor}20`}
            color={statusColor}
          />
        </View>
        <View className="flex-row items-center justify-between mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
          <Text className="text-xs" style={{ color: colors.textMuted }}>
            {item.ai_handled ? t('support.aiAssisted') : t('support.humanConversation')}
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
          hitSlop={8}
          className="w-10 h-10 rounded-xl items-center justify-center border"
          style={{ backgroundColor: colors.surface, borderColor: colors.border }}
        >
          <Ionicons name="filter" size={20} color={colors.text} />
        </Pressable>
      </View>
      <View className="px-5 flex-1 mt-2 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('support.searchConversationsPlaceholder')} />
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title={t('support.failedToLoadConversations')}
            description={formatApiErrorDetail(error)}
            actionLabel={t('common.retry')}
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.uuid}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="chatbubbles-outline"
                title={t('support.noConversations')}
                description={t('support.conversationsWillAppear')}
              />
            }
            ListFooterComponent={
              hasMore ? (
                <Pressable
                  onPress={() => setVisibleCount((count) => Math.min(count + PAGE_SIZE, MAX_VISIBLE))}
                  disabled={isRefetching}
                  className="items-center justify-center py-4 flex-row gap-2"
                >
                  {isRefetching ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                      {t('support.loadMore')}
                    </Text>
                  )}
                </Pressable>
              ) : sessions.length > 0 ? (
                <Text className="text-center text-xs py-4" style={{ color: colors.textMuted }}>
                  {t('support.noMoreConversations')}
                </Text>
              ) : undefined
            }
          />
        )}
      </View>

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        title={t('support.filterByStatus')}
        options={CHAT_STATUS_OPTIONS.map((o) => ({ label: t(o.labelKey), value: o.value }))}
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

const TICKET_STATUS_FILTERS: { labelKey: string; value: TicketStatus | '' }[] = [
  { labelKey: 'common.all', value: '' },
  { labelKey: 'support.open', value: 'open' },
  { labelKey: 'support.inProgress', value: 'in_progress' },
  { labelKey: 'support.resolved', value: 'resolved' },
  { labelKey: 'support.closed', value: 'closed' },
];

const TICKET_LIMIT = 20;

function TicketsTab() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { contentMaxWidth } = useResponsive();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const isStaff = ['admin', 'superadmin', 'employee'].includes(normalizedRole);
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useSupportTickets({
    status: status || undefined,
    search: search || undefined,
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
              {item.order_id ? ` · ${t('pickups.orderHash', { id: item.order_id })}` : ''}
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
              {t(f.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="px-5 flex-1 mt-3 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder={t('support.searchTicketsPlaceholder')}
        />
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title={t('support.failedToLoadTickets')}
            description={formatApiErrorDetail(error)}
            actionLabel={t('common.retry')}
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={tickets}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState
                icon="help-buoy-outline"
                title={t('support.noSupportTickets')}
                description={isStaff ? t('support.noTicketsRaised') : t('support.tapToRaiseTicket')}
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
  const { t } = useAppLanguage();
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
          ? t('support.checkingStatus')
          : isPending
            ? t('support.updating')
            : isOnline
              ? t('support.onlineReceivingChats')
              : t('support.offlineGoOnline')}
      </Text>
    </Pressable>
  );
}

export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { permissions } = usePermissions();
  const { user } = useAuth();
  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const isFieldRole = normalizedRole === 'tailor' || normalizedRole === 'employee';

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

  // Tailor/Bridge get a one-tap "Request a Call" screen instead of the
  // staff conversation/ticket management console below - neither role
  // needs to browse or search support history, they need to ask for help
  // as directly as possible. Previously a tailor landed on the full ticket
  // list+filter+search+category-picker+subject/message form (built for
  // admins triaging every customer's tickets), and a Bridge employee
  // landed on the staff chat-inbox screen (ConversationsTab) instead of
  // any "ask for help" surface at all - neither was ever the right screen
  // for someone asking for help themselves, not managing others' requests.
  // Checked after every hook above has already run unconditionally (Rules
  // of Hooks - this early return must come after all hook calls, not
  // before them).
  if (isFieldRole) {
    return <RequestCallbackScreen />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header
        title={t('support.title')}
        showBack
        rightAction={
          activeTab === 'tickets' ? (
            <Pressable
              onPress={() => router.push('/(drawer)/support/tickets/new')}
              hitSlop={8}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-xl font-bold" style={{ color: colors.onPrimary }}>+</Text>
            </Pressable>
          ) : activeTab === 'conversations' && canSeeConversations ? (
            <Pressable
              onPress={() => router.push('/(drawer)/support/analytics')}
              hitSlop={8}
              className="w-10 h-10 rounded-xl items-center justify-center"
              style={{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }}
            >
              <Ionicons name="stats-chart-outline" size={19} color={colors.text} />
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
              {t('support.conversations')}
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
              {t('support.tickets')}
            </Text>
          </Pressable>
        </View>
      )}

      {activeTab === 'conversations' ? <ConversationsTab /> : <TicketsTab />}
    </View>
  );
}
