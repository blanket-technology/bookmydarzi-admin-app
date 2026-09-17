import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Avatar, Badge, EmptyState, Header, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { useTailors, useTailorWorkload } from '@/features/tailors/hooks/useTailors';
import { formatApiErrorDetail } from '@/utils/errors';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminTailorListItem, TailorWorkloadItem } from '@/types/tailors';

type TailorsView = 'list' | 'workload';

const WorkloadRow = ({ item, colors }: { item: TailorWorkloadItem; colors: ReturnType<typeof useTheme>['colors'] }) => (
  <View
    className="rounded-3xl p-4 mb-3 border flex-row items-center"
    style={{ backgroundColor: colors.card, borderColor: colors.border }}
  >
    <Avatar name={item.tailor_name} size={44} />
    <View className="ml-3 flex-1">
      <Text className="font-bold" style={{ color: colors.text }}>
        {item.tailor_name ?? `Tailor #${item.tailor_id}`}
      </Text>
      <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
        {item.utilization_percentage ?? 0}% utilized
      </Text>
    </View>
    <View className="flex-row" style={{ gap: 16 }}>
      <View className="items-center">
        <Text className="font-bold text-base" style={{ color: colors.primary }}>
          {item.active_orders ?? 0}
        </Text>
        <Text className="text-[10px]" style={{ color: colors.textMuted }}>
          Active
        </Text>
      </View>
      <View className="items-center">
        <Text className="font-bold text-base" style={{ color: colors.accent ?? colors.text }}>
          {item.pending_orders ?? 0}
        </Text>
        <Text className="text-[10px]" style={{ color: colors.textMuted }}>
          Pending
        </Text>
      </View>
      <View className="items-center">
        <Text className="font-bold text-base" style={{ color: '#16a34a' }}>
          {item.completed_orders ?? 0}
        </Text>
        <Text className="text-[10px]" style={{ color: colors.textMuted }}>
          Done
        </Text>
      </View>
    </View>
  </View>
);

export default function TailorsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<TailorsView>('list');
  const { data, isLoading, isError, error, refetch, isRefetching } = useTailors(
    { search },
    view === 'list',
  );
  const {
    data: workloadData,
    isLoading: isWorkloadLoading,
    isError: isWorkloadError,
    error: workloadError,
    refetch: refetchWorkload,
    isRefetching: isWorkloadRefetching,
  } = useTailorWorkload(view === 'workload');

  const tailors = useMemo(() => {
    const items = data?.tailors ?? data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.mobile?.includes(q) ||
        item.tailor_id?.toLowerCase().includes(q) ||
        item.specialization?.toLowerCase().includes(q),
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: AdminTailorListItem }) => (
    <Pressable
      onPress={() => router.push(`/(drawer)/tailors/${item.tailor_id}`)}
      className="rounded-3xl p-4 mb-3 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-center">
        <Avatar name={item.full_name} size={52} />
        <View className="ml-3 flex-1">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.full_name ?? 'Tailor'}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.primary }}>
            ID: {item.tailor_id}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
            {item.email ?? '—'} · {item.mobile ?? '—'}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            {item.specialization ?? 'General Tailoring'}
          </Text>
        </View>
        <View className="items-end gap-2">
          <Badge
            label={item.is_available ? 'Available' : 'Busy'}
            backgroundColor={item.is_available ? '#dcfce7' : '#fef3c7'}
            color={item.is_available ? '#16a34a' : '#d97706'}
          />
          <View className="flex-row items-center" style={{ gap: 3 }}>
            <Ionicons name="star" size={13} color={colors.accent} />
            <Text className="font-bold" style={{ color: colors.accent }}>
              {item.rating?.toFixed(1) ?? '—'}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );

  const workload = workloadData ?? [];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Tailors"
        subtitle={view === 'list' ? `${tailors.length} tailors` : `${workload.length} tailors · workload`}
        rightAction={
          <Pressable
            onPress={() => router.push('/(drawer)/tailors/add')}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.onPrimary }}>+</Text>
          </Pressable>
        }
      />
      <View className="px-5 pt-3 flex-row" style={{ gap: 10 }}>
        {(['list', 'workload'] as TailorsView[]).map((option) => (
          <Pressable
            key={option}
            onPress={() => setView(option)}
            className="flex-1 items-center justify-center rounded-2xl py-2.5 border"
            style={{
              backgroundColor: view === option ? colors.primary : colors.surface,
              borderColor: view === option ? colors.primary : colors.border,
            }}
          >
            <Text
              className="font-semibold text-sm"
              style={{ color: view === option ? '#fff' : colors.text }}
            >
              {option === 'list' ? 'Directory' : 'Workload'}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="px-5 flex-1 mt-3 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {view === 'list' ? (
          <>
            <SearchBar value={search} onChangeText={setSearch} placeholder="Search tailors..." />
            {isLoading ? (
              <SkeletonList count={5} />
            ) : isError ? (
              <EmptyState
                title="Failed to load tailors"
                description={formatApiErrorDetail(error)}
                actionLabel="Retry"
                onAction={refetch}
              />
            ) : (
              <FlatList
                data={tailors}
                keyExtractor={(item) => item.tailor_id}
                renderItem={renderItem}
                refreshControl={
                  <RefreshControl
                    refreshing={isRefetching}
                    onRefresh={refetch}
                    tintColor={colors.primary}
                  />
                }
                ListEmptyComponent={<EmptyState icon="cut-outline" title="No tailors found" />}
              />
            )}
          </>
        ) : isWorkloadLoading ? (
          <SkeletonList count={5} />
        ) : isWorkloadError ? (
          <EmptyState
            title="Failed to load workload"
            description={formatApiErrorDetail(workloadError)}
            actionLabel="Retry"
            onAction={refetchWorkload}
          />
        ) : (
          <FlatList
            data={workload}
            keyExtractor={(item) => item.tailor_id}
            renderItem={({ item }) => <WorkloadRow item={item} colors={colors} />}
            refreshControl={
              <RefreshControl
                refreshing={isWorkloadRefetching}
                onRefresh={refetchWorkload}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={<EmptyState icon="bar-chart-outline" title="No workload data" />}
          />
        )}
      </View>
    </View>
  );
}
