import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import {
  Badge,
  BottomSheet,
  Button,
  ConfirmModal,
  EmptyState,
  Header,
  Input,
  Pagination,
  Pressable,
  SearchBar,
  SkeletonList,
} from '@/components/ui';
import {
  useApplications,
  useApproveApplicationMutation,
  useRejectApplicationMutation,
} from '@/features/applications/hooks/useApplications';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { TailorApplicationListItem } from '@/types/applications';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 15;

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: '#fef3c7', text: '#d97706' },
  approved: { bg: '#dcfce7', text: '#16a34a' },
  rejected: { bg: '#fee2e2', text: '#dc2626' },
};

// GET /admin/tailor-applications' status filter expects uppercase
// (PENDING|APPROVED|REJECTED — see admin.py's list_tailor_applications_admin)
// even though the normalized item.status the rest of this screen renders is
// lowercase (applicationService.ts normalizes on the way in). value here is
// what's sent to the backend; label is what's shown.
const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

export default function ApplicationsScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { permissions } = usePermissions();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState<TailorApplicationListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<TailorApplicationListItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading, isError, error, refetch, isRefetching } = useApplications(
    { page, limit: LIMIT, search: debouncedSearch || undefined, status: statusFilter || undefined },
    permissions.applications,
  );
  const approveMutation = useApproveApplicationMutation();
  const rejectMutation = useRejectApplicationMutation();

  const applications = useMemo(
    () => data?.applications ?? data?.items ?? [],
    [data],
  );

  const totalPages = Math.max(1, Math.ceil((data?.total ?? applications.length) / LIMIT));

  const handleConfirmApprove = () => {
    if (!approveTarget) return;
    approveMutation.mutate(
      { applicationId: String(approveTarget.id) },
      { onSuccess: () => setApproveTarget(null), onError: () => setApproveTarget(null) },
    );
  };

  const openReject = (item: TailorApplicationListItem) => {
    setRejectTarget(item);
    setRejectReason('');
  };

  const handleConfirmReject = () => {
    if (!rejectTarget || rejectReason.trim().length < 5) return;
    rejectMutation.mutate(
      { applicationId: String(rejectTarget.id), payload: { reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setRejectTarget(null);
          setRejectReason('');
        },
      },
    );
  };

  const renderItem = ({ item }: { item: TailorApplicationListItem }) => {
    const statusStyle = STATUS_COLORS[item.status] ?? { bg: colors.primaryLight, text: colors.primary };
    const isPending = item.status === 'pending';

    return (
      <View
        className="rounded-3xl p-4 mb-3 border"
        style={{ backgroundColor: colors.card, borderColor: colors.border }}
      >
        <Pressable onPress={() => router.push(`/(drawer)/applications/${item.id}` as never)}>
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
              {/* Minimum context to judge a pending application from the
                  list without opening the detail screen - previously only
                  name/contact/date were shown, so Approve/Reject here was
                  effectively a blind decision unless the admin tapped in
                  first. KYC document status isn't in the list response
                  (only the detail one), so it's not shown here - don't
                  imply completeness that isn't actually known yet. */}
              {item.experience_years != null || (item.specialization?.length ?? 0) > 0 ? (
                <Text className="text-xs mt-1" style={{ color: colors.textSecondary }} numberOfLines={1}>
                  {item.experience_years != null ? `${item.experience_years} yrs exp` : null}
                  {item.experience_years != null && (item.specialization?.length ?? 0) > 0 ? ' · ' : null}
                  {item.specialization?.length ? item.specialization.join(', ') : null}
                </Text>
              ) : null}
            </View>
            <Badge
              label={item.status}
              backgroundColor={statusStyle.bg}
              color={statusStyle.text}
            />
          </View>
        </Pressable>

        {isPending ? (
          <View className="flex-row gap-2 mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
            <Pressable
              onPress={() => setApproveTarget(item)}
              className="flex-1 items-center py-2 rounded-xl"
              style={{ backgroundColor: colors.primary }}
            >
              <Text className="text-xs font-bold" style={{ color: colors.onPrimary }}>Approve</Text>
            </Pressable>
            <Pressable
              onPress={() => openReject(item)}
              className="flex-1 items-center py-2 rounded-xl border"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-xs font-bold" style={{ color: colors.textSecondary }}>
                Reject
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Applications"
        subtitle={`${data?.total ?? applications.length} tailor applications`}
      />
      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        <SearchBar
          value={search}
          onChangeText={(text) => {
            setSearch(text);
            setPage(1);
          }}
          placeholder="Search applications..."
        />
        <View className="flex-row gap-2 mb-3">
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.value}
              onPress={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
              className="px-3.5 py-1.5 rounded-full border"
              style={{
                backgroundColor: statusFilter === f.value ? colors.primary : colors.surface,
                borderColor: statusFilter === f.value ? colors.primary : colors.border,
              }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: statusFilter === f.value ? '#fff' : colors.text }}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </View>
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
                onRefresh={() => { void refetch(); }}
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

      <ConfirmModal
        visible={!!approveTarget}
        title="Approve Application?"
        message={`Approve ${approveTarget?.full_name ?? 'this application'}? This creates their tailor account.`}
        confirmLabel="Approve"
        loading={approveMutation.isPending}
        onConfirm={handleConfirmApprove}
        onCancel={() => setApproveTarget(null)}
      />

      {rejectTarget ? (
        <BottomSheet
          visible={!!rejectTarget}
          onClose={() => setRejectTarget(null)}
          title="Reject Application"
          footer={
            <Button
              title="Confirm Reject"
              variant="danger"
              onPress={handleConfirmReject}
              loading={rejectMutation.isPending}
              disabled={rejectReason.trim().length < 5}
              fullWidth
            />
          }
        >
          <Input
            label="Rejection Reason"
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Minimum 5 characters"
            multiline
          />
        </BottomSheet>
      ) : null}
    </View>
  );
}
