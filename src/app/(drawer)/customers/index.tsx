import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import {
  Avatar,
  Badge,
  ConfirmModal,
  EmptyState,
  Header,
  Pagination,
  SearchBar,
  SkeletonList,
} from '@/components/ui';
import { useUsers, useUpdateUserStatusMutation } from '@/features/users/hooks/useUsers';
import { useTheme } from '@/hooks/useTheme';
import type { AdminUserItem } from '@/types/users';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 15;

export default function CustomersScreen() {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [confirmUser, setConfirmUser] = useState<AdminUserItem | null>(null);

  const { data, isLoading, isError, error, refetch, isRefetching } = useUsers({
    search: search || undefined,
    page,
    limit: LIMIT,
  });
  const statusMutation = useUpdateUserStatusMutation();

  const users = useMemo(
    () =>
      (data?.users ?? data?.items ?? []).filter(
        (user) => user.role === 'user' || !user.role,
      ),
    [data],
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? users.length) / LIMIT));

  const handleConfirmStatus = () => {
    if (!confirmUser) return;
    const action = confirmUser.is_active ? 'deactivate' : 'activate';
    statusMutation.mutate(
      { userId: confirmUser.id, payload: { action } },
      {
        onSuccess: () => {
          setConfirmUser(null);
          refetch();
        },
      },
    );
  };

  const renderItem = ({ item }: { item: AdminUserItem }) => (
    <Pressable
      onPress={() => router.push(`/(drawer)/customers/${item.id}`)}
      onLongPress={() => setConfirmUser(item)}
      className="rounded-3xl p-4 mb-3 border flex-row items-center"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <Avatar name={item.full_name ?? item.email} size={48} />
      <View className="ml-3 flex-1">
        <Text className="font-bold" style={{ color: colors.text }}>
          {item.full_name ?? 'Customer'}
        </Text>
        <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
          {item.email ?? item.mobile}
        </Text>
        <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
          Joined {formatDate(item.created_at)}
        </Text>
      </View>
      <Badge
        label={item.is_active ? 'Active' : 'Inactive'}
        backgroundColor={item.is_active ? '#dcfce7' : '#fee2e2'}
        color={item.is_active ? '#16a34a' : '#dc2626'}
      />
    </Pressable>
  );

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Customers" subtitle={`${data?.total ?? users.length} customers`} />
      <View className="px-5 flex-1">
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search customers..."
        />
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Failed to load customers"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={refetch}
          />
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState icon="people-outline" title="No customers found" />
            }
            ListFooterComponent={
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            }
          />
        )}
      </View>

      <ConfirmModal
        visible={!!confirmUser}
        title={confirmUser?.is_active ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${confirmUser?.is_active ? 'deactivate' : 'activate'} ${confirmUser?.full_name ?? confirmUser?.email ?? 'this user'}?`}
        confirmLabel={confirmUser?.is_active ? 'Deactivate' : 'Activate'}
        loading={statusMutation.isPending}
        onConfirm={handleConfirmStatus}
        onCancel={() => setConfirmUser(null)}
      />
    </View>
  );
}
