import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Avatar, Badge, EmptyState, Header, Pagination, Pressable, SearchBar, SkeletonList } from '@/components/ui';
import { useStaffPaginated } from '@/features/staff/hooks/useStaff';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { AdminStaffListItem } from '@/types/staff';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 15;

export default function AdminsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, error, refetch, isRefetching } = useStaffPaginated({
    role: 'admin',
    search: debouncedSearch || undefined,
    page,
    limit: LIMIT,
  });

  // Filtered server-side now (GET /admin/staff/paginated's search param) -
  // the previous GET /admin/staff call had no search support at all, so
  // this was always filtering a fetched-in-full, unfiltered list client-side.
  const admins = useMemo(() => data?.items ?? [], [data]);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? admins.length) / LIMIT));

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
        subtitle={`${data?.total ?? admins.length} admin account${(data?.total ?? admins.length) === 1 ? '' : 's'}`}
        rightAction={
          <Pressable
            onPress={() => router.push('/(drawer)/admins/add')}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.onPrimary }}>+</Text>
          </Pressable>
        }
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search admins..."
        />
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
            ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          />
        )}
      </View>
    </View>
  );
}
