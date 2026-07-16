import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  ConfirmModal,
  EmptyState,
  Header,
  Input,
  Loader,
} from '@/components/ui';
import {
  useApplication,
  useApproveApplicationMutation,
  useRejectApplicationMutation,
} from '@/features/applications/hooks/useApplications';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { capitalize, formatDate } from '@/utils/errors';

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { permissions } = usePermissions();
  const [rejectSheetVisible, setRejectSheetVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);

  const { data: application, isLoading, isError } = useApplication(
    id,
    permissions.applications,
  );
  const approveMutation = useApproveApplicationMutation();
  const rejectMutation = useRejectApplicationMutation();

  if (isLoading) return <Loader fullScreen message="Loading application..." />;
  if (isError || !application) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Application" showMenu={false} />
        <EmptyState
          title="Application not found"
          actionLabel="Go Back"
          onAction={() => router.back()}
        />
      </View>
    );
  }

  const isPending = application.status === 'pending';

  const handleApprove = () => {
    approveMutation.mutate(String(application.id), {
      onSuccess: () => {
        setConfirmApprove(false);
        router.back();
      },
    });
  };

  const handleReject = () => {
    if (rejectReason.trim().length < 5) return;
    rejectMutation.mutate(
      { applicationId: String(application.id), payload: { reason: rejectReason.trim() } },
      {
        onSuccess: () => {
          setRejectSheetVisible(false);
          setRejectReason('');
          router.back();
        },
      },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title={application.application_number}
        subtitle={capitalize(application.status)}
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

      <ScrollView className="px-5" showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <Badge
            label={capitalize(application.status)}
            backgroundColor={isPending ? '#fef3c7' : '#dcfce7'}
            color={isPending ? '#d97706' : '#16a34a'}
          />
          <InfoRow label="Name" value={application.full_name} colors={colors} />
          <InfoRow label="Email" value={application.email} colors={colors} />
          <InfoRow label="Phone" value={application.phone} colors={colors} />
          <InfoRow label="City" value={application.city ?? '—'} colors={colors} />
          <InfoRow label="State" value={application.state ?? '—'} colors={colors} />
          <InfoRow
            label="Experience"
            value={application.experience_years != null ? `${application.experience_years} years` : '—'}
            colors={colors}
          />
          <InfoRow
            label="Specialization"
            value={application.specialization?.join(', ') ?? '—'}
            colors={colors}
          />
          <InfoRow label="Submitted" value={formatDate(application.submitted_at)} colors={colors} />
          {application.rejection_reason ? (
            <InfoRow label="Rejection Reason" value={application.rejection_reason} colors={colors} />
          ) : null}
        </Card>

        {isPending ? (
          <View className="mb-8 gap-3">
            <Button
              title="Approve Application"
              onPress={() => setConfirmApprove(true)}
              loading={approveMutation.isPending}
              fullWidth
            />
            <Button
              title="Reject Application"
              variant="danger"
              onPress={() => setRejectSheetVisible(true)}
              loading={rejectMutation.isPending}
              fullWidth
            />
          </View>
        ) : null}
      </ScrollView>

      <ConfirmModal
        visible={confirmApprove}
        title="Approve Application"
        message={`Approve tailor application for ${application.full_name}?`}
        confirmLabel="Approve"
        loading={approveMutation.isPending}
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(false)}
      />

      <BottomSheet
        visible={rejectSheetVisible}
        onClose={() => setRejectSheetVisible(false)}
        title="Reject Application"
      >
        <Input
          label="Rejection Reason"
          value={rejectReason}
          onChangeText={setRejectReason}
          placeholder="Minimum 5 characters"
          multiline
        />
        <Button
          title="Confirm Reject"
          variant="danger"
          onPress={handleReject}
          loading={rejectMutation.isPending}
          fullWidth
        />
      </BottomSheet>
    </View>
  );
}

const InfoRow = ({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['colors'];
}) => (
  <View className="flex-row justify-between py-2.5 border-b" style={{ borderColor: colors.border }}>
    <Text className="text-sm" style={{ color: colors.textSecondary }}>
      {label}
    </Text>
    <Text className="text-sm font-medium flex-1 text-right ml-4" style={{ color: colors.text }}>
      {value}
    </Text>
  </View>
);
