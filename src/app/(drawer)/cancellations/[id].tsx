import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, EmptyState, Header, Input, Loader, Pressable, ScreenContent } from '@/components/ui';
import {
  useApproveCancellationMutation,
  useCancellation,
  usePatchCancellationMutation,
  useRejectCancellationMutation,
} from '@/features/cancellations/hooks/useCancellations';
import { useTheme } from '@/hooks/useTheme';
import { capitalize, formatApiErrorDetail, formatCurrency, formatDateTime } from '@/utils/errors';
import { requireAmountInput } from '@/utils/money';

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#d97706' },
  approved: { bg: '#dcfce7', color: '#16a34a' },
  rejected: { bg: '#fee2e2', color: '#dc2626' },
  refunded: { bg: '#FBF3DF', color: '#7D622A' },
  contact_support: { bg: '#ede9fe', color: '#7c3aed' },
};

export default function CancellationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: cancellation, isLoading, isError, error, refetch } = useCancellation(id);
  const approveMutation = useApproveCancellationMutation();
  const rejectMutation = useRejectCancellationMutation();
  const patchMutation = usePatchCancellationMutation();

  const [approveSheetVisible, setApproveSheetVisible] = useState(false);
  const [approveOverride, setApproveOverride] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [rejectSheetVisible, setRejectSheetVisible] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [editSheetVisible, setEditSheetVisible] = useState(false);
  const [editOverride, setEditOverride] = useState('');
  const [editNotes, setEditNotes] = useState('');

  if (isLoading) return <Loader fullScreen />;
  if (isError || !cancellation) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Cancellation" showMenu={false} />
        <EmptyState
          title="Failed to load cancellation"
          description={formatApiErrorDetail(error)}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const badge = STATUS_BADGE[cancellation.Status] ?? { bg: colors.surface, color: colors.textSecondary };
  const isPending = cancellation.Status === 'pending';
  const effectiveRefund = cancellation.OverrideRefundAmount ?? cancellation.RefundAmount;

  const handleApprove = () => {
    if (approveMutation.isPending) return;
    const override = requireAmountInput(approveOverride);
    if (!override) return;
    approveMutation.mutate(
      {
        id,
        payload: {
          override_refund_amount: override.value,
          admin_notes: approveNotes || undefined,
        },
      },
      { onSuccess: () => { setApproveSheetVisible(false); setApproveOverride(''); setApproveNotes(''); } },
    );
  };

  const handleReject = () => {
    if (!rejectNotes.trim()) return;
    rejectMutation.mutate(
      { id, payload: { admin_notes: rejectNotes } },
      { onSuccess: () => { setRejectSheetVisible(false); setRejectNotes(''); } },
    );
  };

  const openEditSheet = () => {
    setEditOverride(cancellation.OverrideRefundAmount ? String(cancellation.OverrideRefundAmount) : '');
    setEditNotes(cancellation.AdminNotes ?? '');
    setEditSheetVisible(true);
  };

  const handleEdit = () => {
    if (patchMutation.isPending) return;
    const override = requireAmountInput(editOverride);
    if (!override) return;
    patchMutation.mutate(
      {
        id,
        payload: {
          override_refund_amount: override.value,
          admin_notes: editNotes || undefined,
        },
      },
      { onSuccess: () => setEditSheetVisible(false) },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Cancellation Details"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />
      <ScreenContent>
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {cancellation.CancellationCode ?? `#${cancellation.Id}`}
            </Text>
            <Badge label={cancellation.Status.replace(/_/g, ' ')} backgroundColor={badge.bg} color={badge.color} />
          </View>
          <Row label="Order" value={`#${cancellation.OrderId}`} colors={colors} />
          <Row label="Stage at Cancel" value={capitalize(cancellation.OrderStageAtCancel ?? '—')} colors={colors} />
          <Row label="Payment Type" value={capitalize(cancellation.PaymentType)} colors={colors} />
          <Row label="Paid Amount" value={formatCurrency(cancellation.PaidAmount)} colors={colors} />
          <Row label="Penalty" value={`${cancellation.PenaltyPct}% (${formatCurrency(cancellation.PenaltyAmount)})`} colors={colors} />
          <Row label="Calculated Refund" value={formatCurrency(cancellation.RefundAmount)} colors={colors} />
          {cancellation.OverrideRefundAmount != null ? (
            <Row label="Override Refund" value={formatCurrency(cancellation.OverrideRefundAmount)} colors={colors} />
          ) : null}
          <Row label="Effective Refund" value={formatCurrency(effectiveRefund)} colors={colors} />
          <Row label="Reason" value={cancellation.Reason || '—'} colors={colors} />
          <Row label="Admin Notes" value={cancellation.AdminNotes || '—'} colors={colors} />
          <Row label="Requested" value={formatDateTime(cancellation.CreatedAt)} colors={colors} />
          <Row label="Processed" value={cancellation.ProcessedAt ? formatDateTime(cancellation.ProcessedAt) : '—'} colors={colors} />
        </Card>

        {isPending ? (
          <>
            <Button
              title="Approve"
              onPress={() => setApproveSheetVisible(true)}
              className="mb-3"
              fullWidth
            />
            <Button
              title="Reject"
              variant="danger"
              onPress={() => setRejectSheetVisible(true)}
              className="mb-3"
              fullWidth
            />
          </>
        ) : (
          <Button
            title="Edit Refund / Notes"
            variant="outline"
            onPress={openEditSheet}
            className="mb-3"
            fullWidth
          />
        )}
        <View className="mb-8" />
      </ScreenContent>

      <BottomSheet
        visible={approveSheetVisible}
        onClose={() => setApproveSheetVisible(false)}
        title="Approve Cancellation"
        footer={
          <Button
            title="Confirm Approval"
            onPress={handleApprove}
            loading={approveMutation.isPending}
            fullWidth
          />
        }
      >
        <Input
          label={`Override Refund Amount (leave blank for calculated ${formatCurrency(cancellation.RefundAmount)})`}
          value={approveOverride}
          onChangeText={setApproveOverride}
          keyboardType="decimal-pad"
        />
        <Input
          label="Admin Notes (optional)"
          value={approveNotes}
          onChangeText={setApproveNotes}
          multiline
        />
      </BottomSheet>

      <BottomSheet
        visible={rejectSheetVisible}
        onClose={() => setRejectSheetVisible(false)}
        title="Reject Cancellation"
        footer={
          <Button
            title="Confirm Rejection"
            variant="danger"
            onPress={handleReject}
            loading={rejectMutation.isPending}
            disabled={!rejectNotes.trim()}
            fullWidth
          />
        }
      >
        <Input
          label="Reason for rejection (required)"
          value={rejectNotes}
          onChangeText={setRejectNotes}
          multiline
        />
      </BottomSheet>

      <BottomSheet
        visible={editSheetVisible}
        onClose={() => setEditSheetVisible(false)}
        title="Edit Refund / Notes"
        footer={
          <Button
            title="Save Changes"
            onPress={handleEdit}
            loading={patchMutation.isPending}
            fullWidth
          />
        }
      >
        <Input
          label="Override Refund Amount"
          value={editOverride}
          onChangeText={setEditOverride}
          keyboardType="decimal-pad"
        />
        <Input
          label="Admin Notes"
          value={editNotes}
          onChangeText={setEditNotes}
          multiline
        />
      </BottomSheet>
    </View>
  );
}

const Row = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View className="flex-row justify-between py-2.5 border-b" style={{ borderColor: colors.border }}>
    <Text style={{ color: colors.textSecondary }}>{label}</Text>
    <Text className="font-medium text-right flex-1 ml-3" style={{ color: colors.text }}>
      {value}
    </Text>
  </View>
);
