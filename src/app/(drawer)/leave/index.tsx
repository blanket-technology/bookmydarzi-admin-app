import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, RefreshControl, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, DateField, EmptyState, Header, Input, Pressable, SkeletonList } from '@/components/ui';
import {
  useCancelLeaveRequestMutation,
  useCreateLeaveRequestMutation,
  useMyLeaveRequests,
} from '@/features/leave/hooks/useLeave';
import { useTheme } from '@/hooks/useTheme';
import { useResponsive } from '@/hooks/useResponsive';
import type { LeaveRequest } from '@/types/leave';
import { formatApiErrorDetail, formatDate } from '@/utils/errors';

const STATUS_BADGE: Record<LeaveRequest['Status'], { bg: string; color: string; label: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706', label: 'Pending' },
  approved: { bg: '#dcfce7', color: '#16a34a', label: 'Approved' },
  rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
  cancelled: { bg: '#f1f5f9', color: '#64748b', label: 'Withdrawn' },
};

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

function RequestCard({ item, onWithdraw, withdrawing }: { item: LeaveRequest; onWithdraw: () => void; withdrawing: boolean }) {
  const { colors } = useTheme();
  const status = STATUS_BADGE[item.Status] ?? STATUS_BADGE.pending;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text className="font-bold text-base" style={{ color: colors.text }}>
            {formatDate(item.StartDate)} — {formatDate(item.EndDate)}
          </Text>
          {item.Reason ? (
            <Text className="text-sm mt-1" style={{ color: colors.textSecondary }}>
              {item.Reason}
            </Text>
          ) : null}
        </View>
        <Badge label={status.label} backgroundColor={status.bg} color={status.color} />
      </View>

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
        <Pressable
          onPress={onWithdraw}
          disabled={withdrawing}
          className="mt-3 py-2.5 rounded-xl border items-center"
          style={{ borderColor: colors.border, opacity: withdrawing ? 0.6 : 1 }}
        >
          <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
            {withdrawing ? 'Withdrawing…' : 'Withdraw request'}
          </Text>
        </Pressable>
      ) : null}
    </Card>
  );
}

export default function LeaveScreen() {
  const { colors } = useTheme();
  const { contentMaxWidth } = useResponsive();
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyLeaveRequests();
  const createMutation = useCreateLeaveRequestMutation();
  const cancelMutation = useCancelLeaveRequestMutation();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  const requests = data ?? [];

  const resetForm = () => {
    setStartDate(null);
    setEndDate(null);
    setReason('');
    setFormError('');
  };

  const handleClose = () => {
    setSheetVisible(false);
    resetForm();
  };

  const handleStartDateChange = (isoDate: string) => {
    setStartDate(isoDate);
    // Keep the end date valid if it's now before the newly-picked start.
    if (endDate && endDate < isoDate) setEndDate(isoDate);
  };

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      setFormError('Select both a start and end date');
      return;
    }
    if (endDate < startDate) {
      setFormError('End date cannot be before start date');
      return;
    }
    setFormError('');
    createMutation.mutate(
      { start_date: startDate, end_date: endDate, reason: reason.trim() || undefined },
      { onSuccess: handleClose },
    );
  };

  const handleWithdraw = (item: LeaveRequest) => {
    setWithdrawingId(String(item.Id));
    cancelMutation.mutate(String(item.Id), { onSettled: () => setWithdrawingId(null) });
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Leave Requests"
        subtitle={`${requests.length} request${requests.length === 1 ? '' : 's'}`}
        rightAction={
          <Pressable
            onPress={() => setSheetVisible(true)}
            className="w-10 h-10 rounded-xl items-center justify-center"
            style={{ backgroundColor: colors.primary }}
          >
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        }
      />

      <View className="px-5 flex-1 w-full self-center" style={{ maxWidth: contentMaxWidth }}>
        {isLoading ? (
          <SkeletonList count={4} />
        ) : isError ? (
          <EmptyState
            title="Failed to load leave requests"
            description={formatApiErrorDetail(error)}
            actionLabel="Retry"
            onAction={() => refetch()}
          />
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => String(item.Id)}
            renderItem={({ item }) => (
              <RequestCard
                item={item}
                onWithdraw={() => handleWithdraw(item)}
                withdrawing={cancelMutation.isPending && withdrawingId === String(item.Id)}
              />
            )}
            refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="calendar-outline"
                title="No leave requests yet"
                description="Tap + to apply for leave. Admin will review your request."
              />
            }
          />
        )}
      </View>

      <BottomSheet visible={sheetVisible} onClose={handleClose} title="Apply for Leave">
        <DateField
          label="Start date"
          value={startDate}
          onChange={handleStartDateChange}
          minimumDate={startOfToday()}
        />
        <DateField
          label="End date"
          value={endDate}
          onChange={setEndDate}
          minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : startOfToday()}
        />
        <Input
          label="Reason (optional)"
          placeholder="e.g. family function, medical"
          value={reason}
          onChangeText={setReason}
          multiline
          numberOfLines={3}
        />
        {formError ? (
          <Text className="text-xs mb-3" style={{ color: colors.error }}>
            {formError}
          </Text>
        ) : null}
        <Button
          title={createMutation.isPending ? 'Submitting…' : 'Submit request'}
          onPress={handleSubmit}
          loading={createMutation.isPending}
          fullWidth
        />
      </BottomSheet>
    </View>
  );
}
