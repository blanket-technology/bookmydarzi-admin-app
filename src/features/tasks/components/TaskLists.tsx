import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { DueChip, EmptyState, Pressable, SkeletonList } from '@/components/ui';
import { callNumber, openMap } from '@/features/broadcasts/offerCardHelpers';
import { useOrders } from '@/features/orders/hooks/useOrders';
import { buildBridgeTasks, buildTailorTasks, type BridgeTask, type BridgeTaskKind } from '@/features/tasks/fieldTasks';
import { FieldTaskCard } from '@/features/tasks/components/FieldTaskCard';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { AdminOrderItem } from '@/types/orders';
import { formatApiErrorDetail, formatCurrency, formatDate } from '@/utils/errors';

const openOrder = (orderId: string) => router.push(`/(drawer)/orders/${orderId}`);

const customerName = (order: AdminOrderItem): string =>
  order.address?.full_name || order.customer_name || '';

const addressLine = (order: AdminOrderItem): string =>
  order.address
    ? [order.address.address_line_1, order.address.address_line_2, order.address.city, order.address.pincode]
        .filter(Boolean)
        .join(', ')
    : '';

/** Address + call/navigate shortcuts, the three things a rider needs at the door. */
const ContactBlock = ({ order }: { order: AdminOrderItem }) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const line = addressLine(order);
  const mobile = order.address?.mobile || order.customer_mobile;
  const lat = order.address?.latitude;
  const lng = order.address?.longitude;
  return (
    <View>
      {order.expected_delivery_date ? (
        <View className="mb-2">
          <DueChip value={order.expected_delivery_date} />
        </View>
      ) : null}
      {line ? (
        <View className="flex-row items-start">
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} style={{ marginTop: 2 }} />
          <Text className="text-sm ml-1.5 flex-1" style={{ color: colors.text }} numberOfLines={2}>
            {line}
          </Text>
        </View>
      ) : null}
      <View className="flex-row mt-2" style={{ gap: 8 }}>
        {mobile ? (
          <Pressable
            onPress={() => callNumber(mobile)}
            accessibilityLabel={t('tasks.call')}
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="call-outline" size={14} color={colors.primary} />
            <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
              {t('tasks.call')}
            </Text>
          </Pressable>
        ) : null}
        {lat != null && lng != null ? (
          <Pressable
            onPress={() => openMap(lat, lng, customerName(order))}
            accessibilityLabel={t('tasks.navigate')}
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="navigate-outline" size={14} color={colors.primary} />
            <Text className="text-xs font-semibold ml-1.5" style={{ color: colors.primary }}>
              {t('tasks.navigate')}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
};

const BridgeTaskCard = ({ task }: { task: BridgeTask }) => {
  const { t } = useAppLanguage();
  const { colors } = useTheme();
  const { order, kind, collectAmount } = task;
  const name = customerName(order) || t('orders.customer');
  const tailor = order.tailor_name || t('orders.tailorLabel');
  const eyebrow = order.order_code ?? order.order_id;

  if (kind === 'pickup') {
    return (
      <FieldTaskCard
        icon="cube-outline"
        accent="#0ea5e9"
        title={t('tasks.pickupTitle', { name })}
        eyebrow={eyebrow}
        ctaLabel={t('tasks.ctaPickup')}
        onPress={() => openOrder(order.order_id)}
        badge={
          order.scheduled_pickup_at
            ? { label: t('tasks.scheduledFor', { when: formatDate(order.scheduled_pickup_at) }), tone: 'neutral' }
            : undefined
        }
      >
        <ContactBlock order={order} />
      </FieldTaskCard>
    );
  }
  if (kind === 'handover') {
    return (
      <FieldTaskCard
        icon="swap-horizontal-outline"
        accent="#8b5cf6"
        title={t('tasks.handoverTitle', { name: tailor })}
        eyebrow={eyebrow}
        ctaLabel={t('tasks.ctaHandover')}
        onPress={() => openOrder(order.order_id)}
      >
        <DueChip value={order.expected_delivery_date} />
      </FieldTaskCard>
    );
  }
  if (kind === 'collect') {
    return (
      <FieldTaskCard
        icon="storefront-outline"
        accent="#f59e0b"
        title={t('tasks.collectTitle', { name: tailor })}
        eyebrow={eyebrow}
        ctaLabel={t('tasks.ctaCollect')}
        onPress={() => openOrder(order.order_id)}
      />
    );
  }
  return (
    <FieldTaskCard
      icon="bicycle-outline"
      accent={collectAmount > 0 ? colors.error : '#22c55e'}
      title={t('tasks.deliverTitle', { name })}
      eyebrow={eyebrow}
      ctaLabel={collectAmount > 0 ? t('tasks.ctaDeliverCash') : t('tasks.ctaDeliver')}
      onPress={() => openOrder(order.order_id)}
      badge={
        collectAmount > 0
          ? { label: t('tasks.collect', { amount: formatCurrency(collectAmount) }), tone: 'warning' }
          : { label: t('tasks.prepaid'), tone: 'success' }
      }
    >
      <ContactBlock order={order} />
    </FieldTaskCard>
  );
};

interface BridgeTaskListProps {
  /** Restrict to some kinds (Pickups screen: pickup + handover). */
  kinds?: BridgeTaskKind[];
  limit?: number;
  /** Hide the empty state (the host screen has its own). */
  hideEmpty?: boolean;
  /** Section heading, shown only when there is at least one task. */
  title?: string;
}

export const BridgeTaskList = ({ kinds, limit, hideEmpty, title }: BridgeTaskListProps) => {
  const { t } = useAppLanguage();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useOrders({ page: 1, limit: 50 }, true);
  if (isLoading) return <SkeletonList count={2} />;
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title={t('tasks.loadFailed')}
        description={formatApiErrorDetail(error)}
        actionLabel={t('common.retry')}
        onAction={() => refetch()}
      />
    );
  }
  let tasks = buildBridgeTasks(data?.orders ?? [], user?.id);
  if (kinds) tasks = tasks.filter((task) => kinds.includes(task.kind));
  if (limit) tasks = tasks.slice(0, limit);
  if (tasks.length === 0) {
    return hideEmpty ? null : (
      <EmptyState icon="checkmark-done-outline" title={t('tasks.noTasks')} description={t('tasks.noTasksHint')} />
    );
  }
  return (
    <View>
      {title ? (
        <Text className="text-base font-bold mb-3 mt-1" style={{ color: colors.text }}>
          {title}
        </Text>
      ) : null}
      {tasks.map((task) => (
        <BridgeTaskCard key={`${task.kind}-${task.order.order_id}`} task={task} />
      ))}
    </View>
  );
};

export const TailorTaskList = ({ limit }: { limit?: number }) => {
  const { t } = useAppLanguage();
  const { colors } = useTheme();
  const { data, isLoading, isError, error, refetch } = useOrders({ page: 1, limit: 50 }, true);
  if (isLoading) return <SkeletonList count={2} />;
  if (isError) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title={t('tasks.loadFailed')}
        description={formatApiErrorDetail(error)}
        actionLabel={t('common.retry')}
        onAction={() => refetch()}
      />
    );
  }
  let tasks = buildTailorTasks(data?.orders ?? []);
  // Waiting-on-someone-else orders only fill the remaining slots, never push actionable ones out.
  if (limit) tasks = tasks.slice(0, limit);
  if (tasks.length === 0) {
    return <EmptyState icon="cut-outline" title={t('tasks.noTailorTasks')} description={t('tasks.noTailorTasksHint')} />;
  }
  return (
    <View>
      {tasks.map(({ order, stage }) => {
        const items = (order.items ?? []).map((i) => `${i.quantity}× ${i.service_name ?? ''}`.trim()).join(', ');
        const common = {
          eyebrow: order.order_code ?? order.order_id,
          onPress: () => openOrder(order.order_id),
        };
        const detail = (
          <View style={{ gap: 6 }}>
            {items ? (
              <Text className="text-sm" style={{ color: colors.text }} numberOfLines={2}>
                {items}
              </Text>
            ) : null}
            <DueChip value={order.expected_delivery_date} />
          </View>
        );
        switch (stage) {
          case 'start':
            return (
              <FieldTaskCard key={order.order_id} icon="cut-outline" accent="#f97316" title={t('tasks.tailor.start')} ctaLabel={t('tasks.tailor.ctaStart')} {...common}>
                {detail}
              </FieldTaskCard>
            );
          case 'continue':
            return (
              <FieldTaskCard key={order.order_id} icon="color-wand-outline" accent="#8b5cf6" title={t('tasks.tailor.continue')} ctaLabel={t('tasks.tailor.ctaContinue')} {...common}>
                {detail}
              </FieldTaskCard>
            );
          case 'finish':
            return (
              <FieldTaskCard key={order.order_id} icon="checkmark-done-outline" accent="#6366f1" title={t('tasks.tailor.finish')} ctaLabel={t('tasks.tailor.ctaFinish')} {...common}>
                {detail}
              </FieldTaskCard>
            );
          case 'waiting_pickup':
            return (
              <FieldTaskCard key={order.order_id} muted icon="time-outline" title={t('tasks.tailor.waitingPickup')} ctaLabel={t('tasks.tailor.ctaView')} {...common}>
                {detail}
              </FieldTaskCard>
            );
          default:
            return (
              <FieldTaskCard key={order.order_id} muted icon="bicycle-outline" title={t('tasks.tailor.waitingDispatch')} ctaLabel={t('tasks.tailor.ctaView')} {...common}>
                {detail}
              </FieldTaskCard>
            );
        }
      })}
    </View>
  );
};
