import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, ConfirmModal, EmptyState, Header, Loader, Pagination, Pressable, ScreenContent, SkeletonList, Tabs, type TabItem } from '@/components/ui';
import { ORDER_STATUS_COLORS, orderStatusLabel } from '@/constants/orderStatus';
import { useAuditLogs } from '@/features/auditLog/hooks/useAuditLog';
import { useOrders } from '@/features/orders/hooks/useOrders';
import {
  useCustomerFullDetail,
  useDeleteCustomerMutation,
  useResetCustomerPasswordMutation,
  useUpdateUserStatusMutation,
  useUser,
} from '@/features/users/hooks/useUsers';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { formatCurrency, formatDate } from '@/utils/errors';

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'orders', label: 'Orders', icon: 'receipt-outline' },
  { id: 'payments', label: 'Payments', icon: 'wallet-outline' },
  { id: 'support', label: 'Support', icon: 'help-buoy-outline' },
  { id: 'personal', label: 'Personal', icon: 'person-outline' },
  { id: 'activity', label: 'Activity', icon: 'time-outline' },
];

const ORDERS_LIMIT = 10;
const AUDIT_LIMIT = 20;

// ─── small shared row primitives ────────────────────────────────────────────
const Row = ({
  label,
  value,
  colors,
  last,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
  last?: boolean;
}) => (
  <View
    className="flex-row justify-between py-3"
    style={last ? undefined : { borderBottomWidth: 1, borderColor: colors.border }}
  >
    <Text style={{ color: colors.textSecondary }}>{label}</Text>
    <Text className="font-medium" style={{ color: colors.text }}>
      {value}
    </Text>
  </View>
);

const SectionCard = ({
  title,
  count,
  colors,
  children,
}: {
  title: string;
  count?: number;
  colors: ReturnType<typeof useTheme>['colors'];
  children: React.ReactNode;
}) => (
  <Card className="mb-4">
    <View className="flex-row items-center justify-between mb-2">
      <Text className="font-bold" style={{ color: colors.text }}>
        {title}
      </Text>
      {count != null ? (
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {count}
        </Text>
      ) : null}
    </View>
    {children}
  </Card>
);

export default function CustomerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [statusConfirmVisible, setStatusConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);

  const { data: user, isLoading, isError } = useUser(id);
  const { data: fullDetail, isLoading: fullDetailLoading } = useCustomerFullDetail(id);
  const statusMutation = useUpdateUserStatusMutation();
  const deleteMutation = useDeleteCustomerMutation();
  const resetPasswordMutation = useResetCustomerPasswordMutation();

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersIsError,
    refetch: refetchOrders,
  } = useOrders({ customer_id: id, page: ordersPage, limit: ORDERS_LIMIT }, !!id);
  const orders = ordersData?.orders ?? [];
  const ordersTotal = ordersData?.total ?? 0;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ORDERS_LIMIT));

  const { data: auditData, isLoading: auditLoading } = useAuditLogs(
    { user_id: id ? Number(id) : undefined, page: 1, limit: AUDIT_LIMIT },
    !!id,
  );

  const kpis = useMemo(() => {
    const activeOrders = orders.filter(
      (o) => !['completed', 'cancelled', 'delivered'].includes(o.status),
    ).length;
    const totalSpend = (fullDetail?.payments.items ?? [])
      .filter((p) => p.status === 'success' || p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
    return { activeOrders, totalSpend, ordersTotal };
  }, [orders, fullDetail, ordersTotal]);

  // Merges orders + payments + support tickets into one sorted timeline —
  // same "no invented data" client-side composition BMD-Admin web's
  // UserDetailPage.jsx uses (audit log alone is too sparse to be a useful
  // activity feed on its own).
  const timelineEvents = useMemo(() => {
    type Event = { id: string; at: string; title: string; subtitle: string; onPress?: () => void };
    const events: Event[] = [];
    for (const o of orders) {
      if (!o.created_at) continue;
      events.push({
        id: `order-${o.order_id}`,
        at: o.created_at,
        title: `Order ${o.order_code ?? `#${o.order_id}`}`,
        subtitle: orderStatusLabel(o.status),
        onPress: () => router.push(`/(drawer)/orders/${o.order_id}`),
      });
    }
    for (const p of fullDetail?.payments.items ?? []) {
      if (!p.created_at) continue;
      events.push({
        id: `payment-${p.id}`,
        at: p.created_at,
        title: `Payment ${p.payment_code ?? `#${p.id}`}`,
        subtitle: `${formatCurrency(p.amount)} · ${p.status ?? '—'}`,
      });
    }
    for (const t of fullDetail?.support_tickets.items ?? []) {
      if (!t.created_at) continue;
      events.push({
        id: `ticket-${t.id}`,
        at: t.created_at,
        title: `Ticket ${t.ticket_code ?? `#${t.id}`}`,
        subtitle: t.subject ?? '—',
        onPress: () => router.push(`/(drawer)/support/tickets/${t.id}`),
      });
    }
    for (const log of auditData?.items ?? []) {
      if (!log.created_at) continue;
      events.push({
        id: `audit-${log.id}`,
        at: log.created_at,
        title: log.action,
        subtitle: log.performed_by_name ? `By ${log.performed_by_name}` : 'System',
      });
    }
    return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [orders, fullDetail, auditData]);

  const handleConfirmStatus = () => {
    if (!user) return;
    const action = user.is_active ? 'deactivate' : 'activate';
    statusMutation.mutate(
      { userId: user.id, payload: { action } },
      { onSuccess: () => setStatusConfirmVisible(false) },
    );
  };

  const handleConfirmDelete = () => {
    if (!user) return;
    deleteMutation.mutate(user.id);
    setDeleteConfirmVisible(false);
  };

  const handleResetPassword = () => {
    if (!user?.email) {
      Alert.alert('No email on file', 'This account has no email address to send a reset link to.');
      return;
    }
    resetPasswordMutation.mutate(user.email);
  };

  if (isLoading) return <Loader fullScreen message="Loading customer..." />;

  if (isError || !user) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Customer Details" showMenu={false} />
        <EmptyState title="Customer not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Customer Details"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

      <Card className="mx-5 mt-3 items-center" style={{ borderRadius: 24 }}>
        <Avatar name={user.full_name} imageUrl={user.profile_image_url} size={72} />
        <Text className="text-lg font-bold mt-3" style={{ color: colors.text }}>
          {user.full_name ?? 'Customer'}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
          {user.user_code ? `${user.user_code} · ` : ''}
          {user.email ?? '—'} · {user.mobile ?? '—'}
        </Text>
        <View className="flex-row gap-2 mt-2.5">
          <Badge
            label={user.is_active ? 'Active' : 'Inactive'}
            backgroundColor={user.is_active ? '#dcfce7' : '#fee2e2'}
            color={user.is_active ? '#16a34a' : '#dc2626'}
          />
          <Badge
            label={user.is_email_verified ? 'Email Verified' : 'Email Unverified'}
            backgroundColor={user.is_email_verified ? '#dbeafe' : '#fef3c7'}
            color={user.is_email_verified ? '#1d4ed8' : '#d97706'}
          />
        </View>
        <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
          Joined {formatDate(user.created_at)}
          {user.last_login ? ` · Last active ${formatDate(user.last_login)}` : ''}
        </Text>

        <View className="flex-row gap-2 mt-4 flex-wrap justify-center">
          <Button
            title={user.is_active ? 'Deactivate' : 'Activate'}
            size="sm"
            variant={user.is_active ? 'outline' : 'primary'}
            onPress={() => setStatusConfirmVisible(true)}
          />
          <Button
            title="Reset Password"
            size="sm"
            variant="outline"
            loading={resetPasswordMutation.isPending}
            onPress={handleResetPassword}
          />
          <Button
            title="Delete"
            size="sm"
            variant="danger"
            onPress={() => setDeleteConfirmVisible(true)}
          />
        </View>
      </Card>

      <View className="mt-3">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <ScreenContent>
        {activeTab === 'overview' ? (
          <View className="mt-4 mb-8">
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              <KpiTile label="Total Orders" value={kpis.ordersTotal} colors={colors} />
              <KpiTile label="Active Orders" value={kpis.activeOrders} colors={colors} />
              <KpiTile label="Total Spend" value={formatCurrency(kpis.totalSpend)} colors={colors} />
              <KpiTile label="Addresses" value={fullDetail?.addresses.length ?? 0} colors={colors} />
            </View>

            {fullDetailLoading ? (
              <View className="mt-4">
                <SkeletonList count={3} />
              </View>
            ) : (
              <>
                <Pressable onPress={() => setActiveTab('orders')} className="mt-4">
                  <Card className="flex-row items-center justify-between mb-3">
                    <Text className="font-bold" style={{ color: colors.text }}>
                      Orders
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {kpis.ordersTotal}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
                <Pressable onPress={() => setActiveTab('payments')}>
                  <Card className="flex-row items-center justify-between mb-3">
                    <Text className="font-bold" style={{ color: colors.text }}>
                      Payments
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {fullDetail?.payments.total ?? 0}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
                <Pressable onPress={() => setActiveTab('support')}>
                  <Card className="flex-row items-center justify-between mb-3">
                    <Text className="font-bold" style={{ color: colors.text }}>
                      Support Tickets
                    </Text>
                    <View className="flex-row items-center gap-1">
                      <Text className="text-xs" style={{ color: colors.textMuted }}>
                        {fullDetail?.support_tickets.total ?? 0}
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </View>
                  </Card>
                </Pressable>
                {fullDetail && fullDetail.penalties.total > 0 ? (
                  <Card className="mb-3" style={{ backgroundColor: `${colors.error}11` }}>
                    <View className="flex-row items-center">
                      <Ionicons name="warning-outline" size={16} color={colors.error} />
                      <Text className="text-sm font-semibold ml-2" style={{ color: colors.error }}>
                        {fullDetail.penalties.total} penalt{fullDetail.penalties.total === 1 ? 'y' : 'ies'} on record
                      </Text>
                    </View>
                  </Card>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {activeTab === 'orders' ? (
          <View className="mt-4 mb-8">
            {ordersLoading ? (
              <SkeletonList count={4} />
            ) : ordersIsError ? (
              <EmptyState title="Failed to load orders" actionLabel="Retry" onAction={refetchOrders} />
            ) : orders.length === 0 ? (
              <EmptyState icon="receipt-outline" title="No orders yet" />
            ) : (
              <>
                {orders.map((o) => (
                  <OrderRow key={o.order_id} order={o} colors={colors} />
                ))}
                <Pagination page={ordersPage} totalPages={ordersTotalPages} onPageChange={setOrdersPage} />
              </>
            )}
          </View>
        ) : null}

        {activeTab === 'payments' ? (
          <View className="mt-4 mb-8">
            {fullDetailLoading ? (
              <SkeletonList count={4} />
            ) : (
              <>
                <SectionCard title="Payments" count={fullDetail?.payments.total} colors={colors}>
                  {fullDetail?.payments.items.length ? (
                    fullDetail.payments.items.map((p) => (
                      <Pressable
                        key={p.id}
                        onPress={() => p.order_id && router.push(`/(drawer)/orders/${p.order_id}`)}
                      >
                        <Row
                          label={p.payment_code ?? `#${p.id}`}
                          value={`${formatCurrency(p.amount)} · ${p.status ?? '—'}`}
                          colors={colors}
                        />
                      </Pressable>
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No payments yet.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard title="Cancellations" count={fullDetail?.cancellations.total} colors={colors}>
                  {fullDetail?.cancellations.items.length ? (
                    fullDetail.cancellations.items.map((c) => (
                      <Pressable key={c.id} onPress={() => router.push(`/(drawer)/cancellations/${c.id}`)}>
                        <Row
                          label={c.cancellation_code ?? `#${c.id}`}
                          value={`${c.status ?? '—'} · Refund ${formatCurrency(c.refund_amount)}`}
                          colors={colors}
                        />
                      </Pressable>
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No cancellations.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard title="Penalties" count={fullDetail?.penalties.total} colors={colors}>
                  {fullDetail?.penalties.items.length ? (
                    fullDetail.penalties.items.map((p, idx) => (
                      <Row
                        key={p.id}
                        label={formatDate(p.created_at ?? undefined)}
                        value={`${formatCurrency(p.penalty_amount)} · ${p.is_applied ? 'Applied' : 'Pending'}`}
                        colors={colors}
                        last={idx === (fullDetail?.penalties.items.length ?? 0) - 1}
                      />
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No penalties.
                    </Text>
                  )}
                </SectionCard>
              </>
            )}
          </View>
        ) : null}

        {activeTab === 'support' ? (
          <View className="mt-4 mb-8">
            {fullDetailLoading ? (
              <SkeletonList count={4} />
            ) : (
              <>
                <SectionCard title="Support Tickets" count={fullDetail?.support_tickets.total} colors={colors}>
                  {fullDetail?.support_tickets.items.length ? (
                    fullDetail.support_tickets.items.map((t) => (
                      <Pressable key={t.id} onPress={() => router.push(`/(drawer)/support/tickets/${t.id}`)}>
                        <Row
                          label={t.ticket_code ?? `#${t.id}`}
                          value={`${t.subject ?? '—'} · ${t.status ?? '—'}`}
                          colors={colors}
                        />
                      </Pressable>
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No support tickets.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard title="Chat Sessions" count={fullDetail?.chat_sessions.total} colors={colors}>
                  {fullDetail?.chat_sessions.items.length ? (
                    fullDetail.chat_sessions.items.map((s) => (
                      <Pressable key={s.id} onPress={() => router.push(`/(drawer)/support/chat/${s.uuid}`)}>
                        <Row
                          label={s.issue_category ?? `Session #${s.id}`}
                          value={s.status ?? '—'}
                          colors={colors}
                        />
                      </Pressable>
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No chat sessions.
                    </Text>
                  )}
                </SectionCard>
              </>
            )}
          </View>
        ) : null}

        {activeTab === 'personal' ? (
          <View className="mt-4 mb-8">
            {fullDetailLoading ? (
              <SkeletonList count={4} />
            ) : (
              <>
                <SectionCard title="Addresses" count={fullDetail?.addresses.length} colors={colors}>
                  {fullDetail?.addresses.length ? (
                    fullDetail.addresses.map((a, idx) => (
                      <View
                        key={a.id}
                        className="py-2.5"
                        style={
                          idx < (fullDetail?.addresses.length ?? 0) - 1
                            ? { borderBottomWidth: 1, borderColor: colors.border }
                            : undefined
                        }
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                            {a.full_name ?? 'Address'}
                          </Text>
                          {a.is_default ? (
                            <Badge label="Default" backgroundColor={colors.primaryLight} color={colors.primary} />
                          ) : null}
                        </View>
                        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                          {[a.address_line_1, a.address_line_2, a.city, a.state, a.pincode]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                        {a.mobile ? (
                          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                            {a.mobile}
                          </Text>
                        ) : null}
                      </View>
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No saved addresses.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard title="Measurement Profiles" count={fullDetail?.measurements.length} colors={colors}>
                  {fullDetail?.measurements.length ? (
                    fullDetail.measurements.map((m, idx) => (
                      <View
                        key={m.id}
                        className="py-2.5"
                        style={
                          idx < (fullDetail?.measurements.length ?? 0) - 1
                            ? { borderBottomWidth: 1, borderColor: colors.border }
                            : undefined
                        }
                      >
                        <View className="flex-row items-center justify-between">
                          <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                            {m.profile_name}
                          </Text>
                          {m.is_default ? (
                            <Badge label="Default" backgroundColor={colors.primaryLight} color={colors.primary} />
                          ) : null}
                        </View>
                        <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                          {[
                            m.chest != null ? `Chest ${m.chest}` : null,
                            m.waist != null ? `Waist ${m.waist}` : null,
                            m.hips != null ? `Hips ${m.hips}` : null,
                            m.height != null ? `Height ${m.height}` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'No measurements recorded'}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No measurement profiles.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard title="Cart History" count={fullDetail?.carts.total} colors={colors}>
                  {fullDetail?.carts.items.length ? (
                    fullDetail.carts.items.map((c, idx) => (
                      <Row
                        key={c.id}
                        label={`${c.item_count} item${c.item_count === 1 ? '' : 's'} · ${formatDate(c.created_at ?? undefined)}`}
                        value={`${formatCurrency(c.total_amount)} · ${c.status ?? '—'}`}
                        colors={colors}
                        last={idx === (fullDetail?.carts.items.length ?? 0) - 1}
                      />
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No cart history.
                    </Text>
                  )}
                </SectionCard>

                <SectionCard title="Wishlist" count={fullDetail?.wishlist.total} colors={colors}>
                  {fullDetail?.wishlist.items.length ? (
                    fullDetail.wishlist.items.map((w, idx) => (
                      <Row
                        key={w.id}
                        label={w.item_type ?? 'Item'}
                        value={formatDate(w.created_at ?? undefined)}
                        colors={colors}
                        last={idx === (fullDetail?.wishlist.items.length ?? 0) - 1}
                      />
                    ))
                  ) : (
                    <Text className="text-sm py-2" style={{ color: colors.textMuted }}>
                      No wishlist items.
                    </Text>
                  )}
                </SectionCard>
              </>
            )}
          </View>
        ) : null}

        {activeTab === 'activity' ? (
          <View className="mt-4 mb-8">
            {auditLoading && fullDetailLoading && ordersLoading ? (
              <SkeletonList count={4} />
            ) : timelineEvents.length === 0 ? (
              <EmptyState icon="time-outline" title="No activity yet" />
            ) : (
              <Card>
                {timelineEvents.map((event, index) => (
                  <Pressable
                    key={event.id}
                    onPress={event.onPress}
                    disabled={!event.onPress}
                    className="flex-row py-3"
                    style={
                      index < timelineEvents.length - 1
                        ? { borderBottomWidth: 1, borderColor: colors.border }
                        : undefined
                    }
                  >
                    <View
                      className="w-2 h-2 rounded-full mt-1.5 mr-3"
                      style={{ backgroundColor: colors.primary }}
                    />
                    <View className="flex-1">
                      <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                        {event.title}
                      </Text>
                      <Text className="text-xs mt-0.5" style={{ color: colors.textSecondary }}>
                        {event.subtitle}
                      </Text>
                      <Text className="text-[11px] mt-0.5" style={{ color: colors.textMuted }}>
                        {formatDate(event.at)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </Card>
            )}
          </View>
        ) : null}
      </ScreenContent>

      <ConfirmModal
        visible={statusConfirmVisible}
        title={user.is_active ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${user.is_active ? 'deactivate' : 'activate'} ${user.full_name ?? user.email ?? 'this user'}?`}
        confirmLabel={user.is_active ? 'Deactivate' : 'Activate'}
        loading={statusMutation.isPending}
        onConfirm={handleConfirmStatus}
        onCancel={() => setStatusConfirmVisible(false)}
      />

      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Customer?"
        message={`This action cannot be undone. All data for ${user.full_name ?? 'this customer'} will be permanently removed.`}
        confirmLabel="Yes, Delete"
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </View>
  );
}

const KpiTile = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string | number;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View
    className="rounded-2xl p-3 items-center justify-center border"
    style={{ backgroundColor: colors.card, borderColor: colors.border, minWidth: '45%', flexGrow: 1 }}
  >
    <Text className="text-lg font-bold" style={{ color: colors.text }}>
      {value}
    </Text>
    <Text className="text-[10px] text-center mt-0.5" style={{ color: colors.textMuted }}>
      {label}
    </Text>
  </View>
);

const OrderRow = ({
  order,
  colors,
}: {
  order: AdminOrderItem;
  colors: ReturnType<typeof useTheme>['colors'];
}) => {
  const statusColor = ORDER_STATUS_COLORS[order.status] ?? colors.primary;
  return (
    <Pressable
      onPress={() => router.push(`/(drawer)/orders/${order.order_id}`)}
      className="rounded-2xl p-3.5 mb-2.5 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Text className="font-bold text-sm" style={{ color: colors.text }}>
            {order.order_code ?? order.order_id}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {formatDate(order.created_at)}
          </Text>
        </View>
        <Badge label={orderStatusLabel(order.status)} backgroundColor={`${statusColor}20`} color={statusColor} />
      </View>
      <Text className="text-xs font-semibold mt-2" style={{ color: colors.primary }}>
        {formatCurrency(order.final_amount ?? order.amount)}
      </Text>
    </Pressable>
  );
};
