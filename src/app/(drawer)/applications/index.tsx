import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import {
  Badge,
  EmptyState,
  Header,
  Pagination,
  SearchBar,
  SkeletonList,
} from '@/components/ui';
import { useApplications } from '@/features/applications/hooks/useApplications';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import type { TailorApplicationListItem } from '@/types/applications';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 15;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706' },
  approved: { bg: '#dcfce7', text: '#16a34a' },
  rejected: { bg: '#fee2e2', text: '#dc2626' },
};

export default function ApplicationsScreen() {
  const { colors } = useTheme();
  const { permissions } = usePermissions();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useApplications(
    { page, limit: LIMIT, search: search || undefined },
    permissions.applications,
  );

  const applications = useMemo(
    () => data?.applications ?? data?.items ?? [],
    [data],
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? applications.length) / LIMIT));

  const renderItem = ({ item }: { item: TailorApplicationListItem }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? { bg: colors.primaryLight, text: colors.primary };

    return (
      <Pressable
        onPress={() => router.push(`/(drawer)/applications/${item.id}` as never)}
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="font-bold" style={{ color: colors.text }}>
              {item.full_name}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.primary }}>
              {item.application_number}
            </Text>
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.email} · {item.phone}
            </Text>
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {item.city ?? '—'} · {formatDate(item.submitted_at)}
            </Text>
          </View>
          <Badge
            label={item.status}
            backgroundColor={statusStyle.bg}
            color={statusStyle.text}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Applications"
        subtitle={`${data?.total ?? applications.length} tailor applications`}
      />
      <View className="px-5 flex-1">
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search applications..."
        />
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Failed to load applications"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={refetch}
          />
        ) : (
          <FlatList
            data={applications}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor={colors.primary}
              />
            }
            ListEmptyComponent={
              <EmptyState icon="document-text-outline" title="No applications found" />
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
