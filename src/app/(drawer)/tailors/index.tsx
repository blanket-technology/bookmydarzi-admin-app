import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Avatar, Badge, EmptyState, Header, SearchBar, SkeletonList } from '@/components/ui';
import { useTailors } from '@/features/tailors/hooks/useTailors';
import { formatApiErrorDetail } from '@/utils/errors';
import { useTheme } from '@/hooks/useTheme';
import type { AdminTailorListItem } from '@/types/tailors';

export default function TailorsScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isRefetching } = useTailors({ search });

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
          <Text className="font-bold" style={{ color: colors.accent }}>
            ★ {item.rating?.toFixed(1) ?? '—'}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Tailors" subtitle={`${tailors.length} tailors`} />
      <View className="px-5 flex-1">
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
      </View>
    </View>
  );
}
