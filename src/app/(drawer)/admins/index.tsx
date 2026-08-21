import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Avatar, Badge, EmptyState, Header, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { useStaff } from '@/features/staff/hooks/useStaff';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminStaffListItem } from '@/types/staff';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

export default function AdminsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isRefetching } = useStaff({
    role: 'admin',
  });

  const admins = useMemo(() => {
    const items = data ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter(
      (item) =>
        item.full_name?.toLowerCase().includes(q) ||
        item.email?.toLowerCase().includes(q) ||
        item.mobile?.includes(q),
    );
  }, [data, search]);

  const renderItem = ({ item }: { item: AdminStaffListItem }) => (
    <Pressable
      onPress={() => router.push(`/(drawer)/admins/${item.id}`)}
      className="rounded-3xl p-4 mb-3 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View className="flex-row items-center">
        <Avatar name={item.full_name ?? item.email} size={48} />
        <View className="ml-3 flex-1">
          <Text className="font-bold" style={{ color: colors.text }}>
            {item.full_name ?? 'Admin'}
          </Text>
          <Text className="text-sm" style={{ color: colors.textSecondary }}>
            {item.email}
          </Text>
          <Text className="text-sm mt-0.5" style={{ color: colors.textMuted }}>
            {item.mobile ?? '—'} · {formatDate(item.created_at)}
          </Text>
        </View>
        <View className="items-end gap-2">
          <Badge label={item.role} backgroundColor={colors.primaryLight} color={colors.primary} />
          <Badge
            label={item.is_active ? 'Active' : 'Inactive'}
            backgroundColor={item.is_active ? '#dcfce7' : '#fee2e2'}
            color={item.is_active ? '#16a34a' : '#dc2626'}
          />
        </View>
      </View>
    </Pressable>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Admins"
        subtitle={`${admins.length} admin account${admins.length === 1 ? '' : 's'}`}
        rightAction={
          <Pressable
            onPress={() => router.push('/(drawer)/admins/add')}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-white text-xl font-bold">+</Text>
          </Pressable>
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search admins..." />
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load admins"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={refetch}
          />
        ) : (
          <FlatList
            data={admins}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={<EmptyState icon="shield-checkmark-outline" title="No admin accounts" />}
          />
        )}
      </View>
    </View>
  );
}
