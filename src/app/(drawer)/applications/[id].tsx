import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, Switch, Text, View } from 'react-native';
import { Badge, BottomSheet, Button, Card, ConfirmModal, DocumentPreviewModal, EmptyState, Header, Input, Loader, Pressable, ScreenContent } from '@/components/ui';
import {
  useApplication,
  useApproveApplicationMutation,
  useRejectApplicationMutation,
} from '@/features/applications/hooks/useApplications';
import { usePermissions } from '@/hooks/usePermissions';
import { useTheme } from '@/hooks/useTheme';
import { isPdfUrl, resolveDocUrl } from '@/utils/documents';
import { capitalize, formatApiErrorDetail, formatDate } from '@/utils/errors';

export default function ApplicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { permissions } = usePermissions();
  const [rejectSheetVisible, setRejectSheetVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmApprove, setConfirmApprove] = useState(false);
  const [overridePan, setOverridePan] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: application, isLoading, isError, error, refetch } = useApplication(
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
          title="Failed to load application"
          description={formatApiErrorDetail(error)}
          actionLabel="Retry"
          onAction={() => refetch()}
        />
      </View>
    );
  }

  const isPending = application.status === 'pending';

  const handleApprove = () => {
    approveMutation.mutate(
      { applicationId: String(application.id), overridePanRequirement: overridePan },
      {
        onSuccess: () => {
          setConfirmApprove(false);
          router.back();
        },
        onError: () => setConfirmApprove(false),
      },
    );
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

  const documents: { label: string; url?: string | null }[] = [
    { label: 'Aadhaar (Front)', url: application.aadhaar_front_url },
    { label: 'Aadhaar (Back)', url: application.aadhaar_back_url },
    { label: 'PAN Card', url: application.pan_card_url },
    { label: 'Profile Photo', url: application.profile_photo_url },
    { label: 'Bank Passbook', url: application.bank_passbook_url },
  ];

  const handleViewDocument = (url?: string | null) => {
    const resolved = resolveDocUrl(url);
    if (!resolved) return;
    if (isPdfUrl(resolved)) {
      Linking.openURL(resolved).catch(() => {});
      return;
    }
    setPreviewUrl(resolved);
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

      <ScreenContent showsVerticalScrollIndicator={false}>
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="font-bold text-lg" style={{ color: colors.text }}>
              {application.full_name}
            </Text>
            <Badge
              label={capitalize(application.status)}
              backgroundColor={isPending ? '#fef3c7' : application.status === 'approved' ? '#dcfce7' : '#fee2e2'}
              color={isPending ? '#d97706' : application.status === 'approved' ? '#16a34a' : '#dc2626'}
            />
          </View>
          <InfoRow label="Email" value={application.email} colors={colors} />
          <InfoRow label="Phone" value={application.phone} colors={colors} />
          <InfoRow label="Address" value={application.address ?? '—'} colors={colors} />
          <InfoRow label="City" value={application.city ?? '—'} colors={colors} />
          <InfoRow label="State" value={application.state ?? '—'} colors={colors} />
          <InfoRow label="Pincode" value={application.pincode ?? '—'} colors={colors} />
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
          {application.reviewed_at ? (
            <InfoRow label="Reviewed" value={formatDate(application.reviewed_at)} colors={colors} />
          ) : null}
          {application.rejection_reason ? (
            <InfoRow label="Rejection Reason" value={application.rejection_reason} colors={colors} />
          ) : null}
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            BANK DETAILS
          </Text>
          <InfoRow label="Account Holder" value={application.account_holder_name ?? '—'} colors={colors} />
          <InfoRow label="Account Number" value={application.bank_account_number ?? '—'} colors={colors} />
          <InfoRow label="IFSC Code" value={application.ifsc_code ?? '—'} colors={colors} />
          <InfoRow label="UPI ID" value={application.upi_id ?? '—'} colors={colors} />
        </Card>

        <Card className="mb-4">
          <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
            KYC DOCUMENTS
          </Text>
          {documents.map((doc) => (
            <View
              key={doc.label}
              className="flex-row items-center justify-between py-2.5 border-b"
              style={{ borderColor: colors.border }}
            >
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                {doc.label}
              </Text>
              {doc.url ? (
                <Pressable
                  onPress={() => handleViewDocument(doc.url)}
                  className="flex-row items-center"
                >
                  <Text className="text-sm font-semibold mr-1" style={{ color: colors.primary }}>
                    {isPdfUrl(doc.url) ? 'Open PDF' : 'View'}
                  </Text>
                  <Ionicons
                    name={isPdfUrl(doc.url) ? 'document-text-outline' : 'eye-outline'}
                    size={16}
                    color={colors.primary}
                  />
                </Pressable>
              ) : (
                <Text className="text-sm" style={{ color: colors.textMuted }}>
                  Not provided
                </Text>
              )}
            </View>
          ))}
        </Card>

        {application.portfolio_images && application.portfolio_images.length > 0 ? (
          <Card className="mb-4">
            <Text className="text-sm font-semibold mb-3" style={{ color: colors.textSecondary }}>
              PORTFOLIO
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
              {application.portfolio_images.map((url, index) => (
                <Pressable
                  key={`${url}-${index}`}
                  onPress={() => setPreviewUrl(resolveDocUrl(url) ?? null)}
                  className="mx-1"
                >
                  <Image
                    source={{ uri: resolveDocUrl(url) }}
                    style={{ width: 96, height: 96, borderRadius: 12 }}
                    contentFit="cover"
                  />
                </Pressable>
              ))}
            </ScrollView>
          </Card>
        ) : null}

        {isPending ? (
          <View className="mb-8 gap-3">
            {!application.pan_card_url ? (
              <View
                className="flex-row items-center p-3 rounded-2xl"
                style={{ backgroundColor: '#fef3c7' }}
              >
                <Ionicons name="warning-outline" size={18} color="#d97706" />
                <Text className="text-xs ml-2 flex-1" style={{ color: '#92400e' }}>
                  No PAN card uploaded — approving requires waiving this requirement.
                </Text>
              </View>
            ) : null}
            <Button
              title="Approve Application"
              onPress={() => {
                setOverridePan(false);
                setConfirmApprove(true);
              }}
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
      </ScreenContent>

      {application.pan_card_url ? (
        <ConfirmModal
          visible={confirmApprove}
          title="Approve Application"
          message={`Approve tailor application for ${application.full_name}?`}
          confirmLabel="Approve"
          loading={approveMutation.isPending}
          onConfirm={handleApprove}
          onCancel={() => setConfirmApprove(false)}
        />
      ) : (
        <BottomSheet
          visible={confirmApprove}
          onClose={() => setConfirmApprove(false)}
          title="Approve Without PAN Card"
        >
          <Text className="text-sm mb-4" style={{ color: colors.textSecondary }}>
            {application.full_name} has not uploaded a PAN card. Approving anyway waives this
            requirement for their account — this is recorded against your review.
          </Text>
          <View className="flex-row items-center justify-between mb-5">
            <Text style={{ color: colors.text }}>Waive PAN requirement</Text>
            <Switch value={overridePan} onValueChange={setOverridePan} trackColor={{ true: colors.primary }} />
          </View>
          <Button
            title="Approve Application"
            onPress={handleApprove}
            loading={approveMutation.isPending}
            disabled={!overridePan}
            fullWidth
          />
        </BottomSheet>
      )}

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

      <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />
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
