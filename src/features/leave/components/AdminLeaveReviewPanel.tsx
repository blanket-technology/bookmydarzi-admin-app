import { useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Modal,
  Pagination,
  Pressable,
  SkeletonList,
} from '@/components/ui';
import {
  useAdminLeaveRequests,
  useApproveLeaveRequestMutation,
  useRejectLeaveRequestMutation,
} from '@/features/leave/hooks/useLeave';
import { useTheme } from '@/hooks/useTheme';
import type { LeaveRequestListItem } from '@/types/leave';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const LIMIT = 15;

const STATUS_BADGE: Record<LeaveRequestListItem['Status'], { bg: string; color: string; label: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
  cancelled: { bg: '#f1f5f9', color: '#64748b', label: 'Withdrawn' },
};

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'cancelled' },
];

const ROLE_FILTERS = [
  { label: 'All roles', value: '' },
  { label: 'Tailor', value: 'tailor' },
  { label: 'Bridge', value: 'employee' },
];

function RequestRow({
  item,
  onApprove,
  onReject,
  busy,
}: {
  item: LeaveRequestListItem;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  const { colors } = useTheme();
  const status = STATUS_BADGE[item.Status] ?? STATUS_BADGE.pending;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {item.UserName ?? `User #${item.UserId}`}
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
            {item.Role === 'tailor' ? 'Tailor' : 'Bridge'}
            {item.UserMobile ? ` · ${item.UserMobile}` : ''}
          </Text>
        </View>
        <Badge label={status.label} backgroundColor={status.bg} color={status.color} />
      </View>

      <Text className="font-semibold" style={{ color: colors.text }}>
        {formatDate(item.StartDate)} — {formatDate(item.EndDate)}
      </Text>
      {item.Reason ? (
        <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
          {item.Reason}
        </Text>
      ) : null}

      {item.AdminNotes ? (
        <View className="mt-2 p-3 rounded-2xl" style={{ backgroundColor: colors.surface }}>
          <Text className="text-xs font-semibold mb-0.5" style={{ color: colors.textMuted }}>
            Admin note
          </Text>
          <Text className="text-sm" style={{ color: colors.text }}>
            {item.AdminNotes}
          </Text>
        </View>
      ) : null}

      <Text className="text-xs mt-2" style={{ color: colors.textMuted }}>
        Requested {formatDate(item.CreatedAt)}
      </Text>

      {item.Status === 'pending' ? (
        <View className="flex-row mt-3" style={{ gap: 10 }}>
          <Pressable
            onPress={onReject}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl border items-center"
            style={{ borderColor: colors.error, opacity: busy ? 0.6 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.error }}>
              Reject
            </Text>
          </Pressable>
          <Pressable
            onPress={onApprove}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl items-center"
            style={{ backgroundColor: colors.primary, opacity: busy ? 0.6 : 1 }}
          >
            <Text className="text-sm font-semibold" style={{ color: colors.onPrimary }}>Approve</Text>
          </Pressable>
        </View>
      ) : null}
    </Card>
  );
}

// Admin/superadmin review counterpart to the tailor/employee self-service
// apply/withdraw UI in leave/index.tsx - mirrors web's LeaveRequestsPage.jsx
// (status + role filters, approve/reject with an admin note).
export const AdminLeaveReviewPanel = () => {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [role, setRole] = useState<'' | 'tailor' | 'employee'>('');
  const [rejectTarget, setRejectTarget] = useState<LeaveRequestListItem | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);

  const params = useMemo(
    () => ({ page, limit: LIMIT, status: status || undefined, role: role || undefined }),
    [page, status, role],
  );
  const { data, isLoading, isError, error, refetch, isRefetching } = useAdminLeaveRequests(params);
  const approveMutation = useApproveLeaveRequestMutation();
  const rejectMutation = useRejectLeaveRequestMutation();

  const items = data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));

  const handleApprove = (item: LeaveRequestListItem) => {
    if (approveMutation.isPending) return;
    // Approval cannot be undone and approved leave blocks job assignment: confirm first.
    Alert.alert(
      'Approve leave?',
      'Approved leave cannot be reversed and the employee will not be assigned jobs while on leave.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            setBusyId(item.Id);
            approveMutation.mutate({ requestId: String(item.Id) }, { onSettled: () => setBusyId(null) });
          },
        },
      ],
    );
  };

  const handleConfirmReject = () => {
    if (!rejectTarget || !rejectNotes.trim()) return;
    setBusyId(rejectTarget.Id);
    rejectMutation.mutate(
      { requestId: String(rejectTarget.Id), payload: { admin_notes: rejectNotes.trim() } },
      {
        onSettled: () => setBusyId(null),
        onSuccess: () => {
          setRejectTarget(null);
          setRejectNotes('');
        },
      },
    );
  };

  return (
    <View className="flex-1">
      <View className="px-5 pt-3 flex-row flex-wrap" style={{ gap: 8 }}>
        {STATUS_FILTERS.map((f) => (
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
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View className="px-5 pt-2 flex-row flex-wrap" style={{ gap: 8 }}>
        {ROLE_FILTERS.map((f) => (
          <Pressable
            key={f.value}
            onPress={() => {
              setRole(f.value as '' | 'tailor' | 'employee');
              setPage(1);
            }}
            className="px-3.5 py-1.5 rounded-full border"
            style={{
              backgroundColor: role === f.value ? colors.text : 'transparent',
              borderColor: colors.border,
            }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: role === f.value ? '#fff' : colors.textSecondary }}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="px-5 flex-1 mt-3">
        {isLoading ? (
          <SkeletonList count={5} />
        ) : isError ? (
          <EmptyState
            title="Failed to load leave requests"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => String(item.Id)}
            renderItem={({ item }) => (
              <RequestRow
                item={item}
                onApprove={() => handleApprove(item)}
                onReject={() => {
                  setRejectTarget(item);
                  setRejectNotes('');
                }}
                busy={busyId === item.Id}
              />
            )}
            refreshControl={
              <RefreshControl refreshing={isRefetching} onRefresh={() => { void refetch(); }} tintColor={colors.primary} />
            }
            ListEmptyComponent={
              <EmptyState icon="calendar-outline" title="No leave requests" description="Nothing matches these filters." />
            }
            ListFooterComponent={<Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}
          />
        )}
      </View>

      <Modal
        visible={!!rejectTarget}
        title="Reject Leave Request"
        onClose={() => {
          setRejectTarget(null);
          setRejectNotes('');
        }}
      >
        <Text className="text-sm leading-5 mb-4" style={{ color: colors.textSecondary }}>
          Reject {rejectTarget?.UserName ?? 'this'}&apos;s leave request? A reason is required.
        </Text>
        <Input
          label="Reason for rejection"
          placeholder="e.g. insufficient notice, overlapping with another request"
          value={rejectNotes}
          onChangeText={setRejectNotes}
          multiline
          numberOfLines={3}
        />
        <View className="flex-row mt-2" style={{ gap: 12 }}>
          <View className="flex-1">
            <Button
              title="Cancel"
              variant="outline"
              onPress={() => {
                setRejectTarget(null);
                setRejectNotes('');
              }}
              fullWidth
            />
          </View>
          <View className="flex-1">
            <Button
              title="Reject"
              onPress={handleConfirmReject}
              loading={rejectMutation.isPending}
              disabled={!rejectNotes.trim()}
              fullWidth
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};
