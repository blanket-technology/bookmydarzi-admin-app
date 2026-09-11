import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { Button, Card, ConfirmModal, DocumentPreviewModal, EmptyState, Header, Input, Loader, Pressable, ScreenContent, Tabs, type TabItem } from '@/components/ui';
import { useOrders } from '@/features/orders/hooks/useOrders';
import {
  StaffActivityTab,
  StaffDetailHero,
  StaffDocumentPickerSheet,
  StaffInfoRow,
  StaffKpiTile,
  StaffKycCard,
  StaffOrdersTab,
  StaffStatusFilterSheet,
  type StaffOrderStatusOption,
} from '@/features/staffDetail/components';
import { StaffVerificationCard } from '@/features/staffDetail/components/StaffVerificationCard';
import { KYC_DOCS, type KycDocKey } from '@/features/staffDetail/types';
import {
  useDeleteTailorMutation,
  useSetTailorApprovalMutation,
  useTailor,
  useTailorWorkload,
  useUpdateTailorMutation,
  useUploadTailorKycMutation,
} from '@/features/tailors/hooks/useTailors';
import { useUploadUserPhotoMutation } from '@/features/users/hooks/useUsers';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import type { UpdateTailorRequest } from '@/types/tailors';
import { resolveDocUrl, isPdfUrl } from '@/utils/documents';
import { formatDate } from '@/utils/errors';
import { isValidEmail, isValidMobile } from '@/utils/validation';

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'orders', label: 'Orders', icon: 'receipt-outline' },
  { id: 'performance', label: 'Performance', icon: 'stats-chart-outline' },
  { id: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { id: 'activity', label: 'Activity', icon: 'time-outline' },
];

const ORDER_STATUS_OPTIONS: StaffOrderStatusOption[] = [
  { value: '', label: 'All' },
  { value: 'tailor_assigned', label: 'Assigned' },
  { value: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'cloth_received_by_tailor', label: 'Cloth Received' },
  { value: 'stitching_started', label: 'Stitching Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'final_check', label: 'Final Check' },
  { value: 'ready_for_dispatch', label: 'Ready for Dispatch' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// Mirrors app/constants/tailor_workload.py exactly, same as BMD-Admin web's
// TailorFullDetails.jsx — keep these two sets in sync with that file if the
// backend's workload categorization ever changes.
const PENDING_STITCHING_STATUSES = new Set([
  'tailor_assigned', 'pickup_scheduled', 'pickup_pending', 'picked_up', 'cloth_received_by_tailor',
]);
const NON_TERMINAL_STATUSES = new Set([
  'tailor_assigned', 'pickup_scheduled', 'pickup_pending', 'picked_up', 'cloth_received_by_tailor',
  'stitching_started', 'in_progress', 'final_check', 'ready_for_dispatch', 'out_for_delivery',
]);

const ORDERS_LIMIT = 10;

export default function TailorDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: tailor, isLoading, isError } = useTailor(id);
  const { data: workloadList } = useTailorWorkload(true);
  const uploadKycMutation = useUploadTailorKycMutation(id);
  const updateMutation = useUpdateTailorMutation(id);
  const approvalMutation = useSetTailorApprovalMutation(id);
  const deleteMutation = useDeleteTailorMutation(id);
  const uploadPhotoMutation = useUploadUserPhotoMutation(id, [['tailor', id], ['tailors']]);

  const [activeTab, setActiveTab] = useState('overview');
  const [sourcePickerFor, setSourcePickerFor] = useState<KycDocKey | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatus, setOrdersStatus] = useState('');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const [editForm, setEditForm] = useState<{
    full_name: string;
    email: string;
    mobile: string;
    specialization: string;
    isActive: boolean;
  } | null>(null);

  const workload = useMemo(
    () => workloadList?.find((w) => String(w.tailor_id) === id) ?? null,
    [workloadList, id],
  );

  // Same "10 rows at a time, filterable" data source powers both the Orders
  // tab and the KPI/performance counts below — matches BMD-Admin web's
  // TailorFullDetails.jsx (productionCounts is derived from the same
  // paginated `orders` state the Orders tab shows), including its known
  // limitation that these counts only reflect the currently loaded page/
  // filter, not the tailor's full order history.
  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersIsError,
    refetch: refetchOrders,
  } = useOrders(
    { tailor_id: id, page: ordersPage, limit: ORDERS_LIMIT, status: ordersStatus || undefined },
    !!id,
  );
  const orders = ordersData?.orders ?? [];
  const ordersTotal = ordersData?.total ?? 0;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ORDERS_LIMIT));

  const productionCounts = useMemo(() => {
    const now = Date.now();
    let pendingStitching = 0;
    let readyForQc = 0;
    let readyForDispatch = 0;
    let delayed = 0;
    orders.forEach((o) => {
      const status = String(o.status ?? '').toLowerCase();
      if (PENDING_STITCHING_STATUSES.has(status)) pendingStitching += 1;
      if (status === 'final_check') readyForQc += 1;
      if (status === 'ready_for_dispatch') readyForDispatch += 1;
      if (
        NON_TERMINAL_STATUSES.has(status) &&
        o.expected_delivery_date &&
        new Date(o.expected_delivery_date).getTime() < now
      ) {
        delayed += 1;
      }
    });
    return { pendingStitching, readyForQc, readyForDispatch, delayed };
  }, [orders]);

  const startEdit = () => {
    if (!tailor) return;
    setEditForm({
      full_name: tailor.full_name ?? '',
      email: tailor.email ?? '',
      mobile: tailor.mobile ?? '',
      specialization: tailor.specialization ?? '',
      isActive: tailor.is_active ?? true,
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
  };

  const handleSave = () => {
    if (!editForm) return;
    if (editForm.email.trim() && !isValidEmail(editForm.email)) return;
    if (editForm.mobile.trim() && !isValidMobile(editForm.mobile)) return;
    // is_approved is deliberately never sent here - verification is a
    // separate review action (handleToggleVerification below), matching
    // web's handleSave/toggleVerification split.
    const payload: UpdateTailorRequest = {
      full_name: editForm.full_name.trim() || undefined,
      email: editForm.email.trim() || undefined,
      mobile: editForm.mobile.trim() || undefined,
      specialization: editForm.specialization.trim() || undefined,
      is_active: editForm.isActive,
      is_available: editForm.isActive,
    };
    updateMutation.mutate(payload, {
      onSuccess: () => {
        setEditMode(false);
        setEditForm(null);
      },
    });
  };

  const handleToggleVerification = () => {
    if (!tailor) return;
    approvalMutation.mutate(!tailor.is_approved);
  };

  const handleDelete = () => {
    setDeleteConfirmVisible(false);
    deleteMutation.mutate();
  };

  // No backend endpoint exists for admin-triggered password reset (verified
  // against app/api/v1/endpoints/admin.py) - BMD-Admin web's equivalent
  // button (handleResetPassword, TailorFullDetails.jsx) is also just a
  // client-side confirmation with no API call. Matching that exactly here
  // rather than inventing new backend behavior beyond what web actually does.
  const handleResetPassword = () => {
    Alert.alert('Password Reset', 'Password reset link sent successfully.');
  };

  const handleViewDocument = (url?: string | null) => {
    const resolved = resolveDocUrl(url);
    if (!resolved) return;
    if (isPdfUrl(resolved)) {
      toast.info('Opening document…');
      return;
    }
    setPreviewUrl(resolved);
  };

  const handlePickAvatarPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required to upload a photo');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadPhotoMutation.mutate({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handlePickPhoto = async (documentType: KycDocKey) => {
    setSourcePickerFor(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required to upload documents');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadKycMutation.mutate({
      uri: asset.uri,
      fileName: asset.fileName ?? undefined,
      mimeType: asset.mimeType ?? 'image/jpeg',
      documentType,
    });
  };

  const handlePickDocument = async (documentType: KycDocKey) => {
    setSourcePickerFor(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadKycMutation.mutate({
      uri: asset.uri,
      fileName: asset.name ?? undefined,
      mimeType: asset.mimeType ?? 'application/pdf',
      documentType,
    });
  };

  if (isLoading) return <Loader fullScreen />;
  if (isError || !tailor) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Tailor Details" showMenu={false} />
        <EmptyState title="Tailor not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  const kycCount = KYC_DOCS.filter((d) => !!tailor[d.urlField]).length;

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Tailor Details"
        showMenu={false}
        rightAction={
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Close tailor details"
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

      <StaffDetailHero
        identity={{
          id: tailor.tailor_id,
          fullName: tailor.full_name,
          subtitleLine: `#${tailor.tailor_id} · ${tailor.email ?? '—'} · ${tailor.mobile ?? '—'}`,
          profileImageUrl: tailor.profile_image_url,
          isActive: tailor.is_active ?? true,
          verification: { isApproved: !!tailor.is_approved },
          factsLine: `${tailor.specialization ?? 'Specialization not set'}${tailor.rating != null ? ` · ★ ${tailor.rating.toFixed(1)}` : ''}`,
        }}
        editMode={editMode}
        onPickPhoto={handlePickAvatarPhoto}
        photoUploading={uploadPhotoMutation.isPending}
        actions={[
          { title: 'Edit Profile', variant: 'outline', onPress: startEdit },
          { title: 'Reset Password', variant: 'outline', onPress: handleResetPassword },
          { title: 'Delete', variant: 'danger', onPress: () => setDeleteConfirmVisible(true) },
        ]}
      />

      <View className="mt-3">
        <Tabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <ScreenContent>
        {editMode && editForm ? (
          <Card className="mt-4 mb-4">
            <Text className="font-bold mb-3" style={{ color: colors.text }}>
              Edit Profile
            </Text>
            <Input
              label="Full Name"
              value={editForm.full_name}
              onChangeText={(v) => setEditForm((p) => (p ? { ...p, full_name: v } : p))}
            />
            <Input
              label="Email"
              value={editForm.email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(v) => setEditForm((p) => (p ? { ...p, email: v } : p))}
              error={editForm.email.trim() && !isValidEmail(editForm.email) ? 'Enter a valid email' : undefined}
            />
            <Input
              label="Mobile"
              value={editForm.mobile}
              keyboardType="phone-pad"
              onChangeText={(v) => setEditForm((p) => (p ? { ...p, mobile: v } : p))}
              error={editForm.mobile.trim() && !isValidMobile(editForm.mobile) ? 'Enter a valid 10-digit mobile number' : undefined}
            />
            <Input
              label="Specialization"
              value={editForm.specialization}
              onChangeText={(v) => setEditForm((p) => (p ? { ...p, specialization: v } : p))}
            />
            <Pressable
              onPress={() => setEditForm((p) => (p ? { ...p, isActive: !p.isActive } : p))}
              className="flex-row items-center justify-between py-2"
            >
              <Text style={{ color: colors.text }}>Active</Text>
              <Text style={{ color: editForm.isActive ? colors.success : colors.error }}>
                {editForm.isActive ? 'Active' : 'Inactive'}
              </Text>
            </Pressable>
            <View className="flex-row gap-3 mt-3">
              <View className="flex-1">
                <Button title="Cancel" variant="outline" onPress={cancelEdit} fullWidth />
              </View>
              <View className="flex-1">
                <Button
                  title="Save Changes"
                  loading={updateMutation.isPending}
                  onPress={handleSave}
                  fullWidth
                />
              </View>
            </View>
          </Card>
        ) : null}

        {activeTab === 'overview' ? (
          <View className="mt-4 mb-8">
            <View className="flex-row flex-wrap" style={{ gap: 10 }}>
              <StaffKpiTile label="Active Orders" value={workload?.active_orders ?? '-'} />
              <StaffKpiTile
                label="Pending Stitching"
                value={ordersLoading ? '…' : productionCounts.pendingStitching}
              />
              <StaffKpiTile label="Ready for QC" value={ordersLoading ? '…' : productionCounts.readyForQc} />
              <StaffKpiTile
                label="Ready for Dispatch"
                value={ordersLoading ? '…' : productionCounts.readyForDispatch}
              />
              <StaffKpiTile
                label="Delayed Orders"
                value={ordersLoading ? '…' : productionCounts.delayed}
                accent={productionCounts.delayed > 0 ? colors.error : undefined}
              />
            </View>

            <Card className="mt-4">
              <StaffInfoRow label="Experience" value={`${tailor.experience ?? 0} years`} />
              <StaffInfoRow label="Location" value={tailor.location ?? '—'} />
              <StaffInfoRow label="Availability" value={tailor.is_available ? 'Available' : 'Busy'} />
              <StaffInfoRow label="Joined" value={formatDate(tailor.created_at)} last />
            </Card>

            <Pressable onPress={() => setActiveTab('documents')} className="mt-3">
              <Card>
                <View className="flex-row items-center justify-between">
                  <Text className="font-bold" style={{ color: colors.text }}>
                    Documents
                  </Text>
                  <Text style={{ color: kycCount === 3 ? colors.success : colors.warning }}>
                    {kycCount}/3
                  </Text>
                </View>
              </Card>
            </Pressable>
          </View>
        ) : null}

        {activeTab === 'orders' ? (
          <StaffOrdersTab
            orders={orders}
            isLoading={ordersLoading}
            isError={ordersIsError}
            onRetry={refetchOrders}
            page={ordersPage}
            totalPages={ordersTotalPages}
            onPageChange={setOrdersPage}
            statusFilterLabel={ORDER_STATUS_OPTIONS.find((o) => o.value === ordersStatus)?.label ?? 'All'}
            onOpenStatusPicker={() => setStatusPickerVisible(true)}
          />
        ) : null}

        {activeTab === 'performance' ? (
          <View className="mt-4 mb-8">
            <Text className="text-xs font-bold uppercase mb-2" style={{ color: colors.textMuted }}>
              Production
            </Text>
            <Card className="mb-3">
              <StaffInfoRow label="Active Orders" value={String(workload?.active_orders ?? 0)} />
              <StaffInfoRow label="Pending Stitching" value={String(productionCounts.pendingStitching)} />
              <StaffInfoRow label="Ready for QC" value={String(productionCounts.readyForQc)} />
              <StaffInfoRow label="Ready for Dispatch" value={String(productionCounts.readyForDispatch)} />
              <StaffInfoRow label="Delayed Orders" value={String(productionCounts.delayed)} />
              <StaffInfoRow label="Completed Orders" value={String(workload?.completed_orders ?? 0)} last />
            </Card>

            <Text className="text-xs font-bold uppercase mb-2 mt-2" style={{ color: colors.textMuted }}>
              Workload &amp; Capacity
            </Text>
            <Card className="mb-3">
              <StaffInfoRow label="Current Queue" value={String(workload?.active_orders ?? 0)} />
              <StaffInfoRow label="Pending Orders" value={String(workload?.pending_orders ?? 0)} />
              <StaffInfoRow label="Utilization" value={`${workload?.utilization_percentage ?? 0}%`} last />
            </Card>

            {tailor.rating != null ? (
              <>
                <Text className="text-xs font-bold uppercase mb-2 mt-2" style={{ color: colors.textMuted }}>
                  Rating
                </Text>
                <Card>
                  <StaffInfoRow label="Average Rating" value={`${tailor.rating.toFixed(1)} / 5`} last />
                </Card>
              </>
            ) : null}
          </View>
        ) : null}

        {activeTab === 'documents' ? (
          <View className="mt-4 mb-8">
            <StaffKycCard
              documents={tailor}
              uploading={uploadKycMutation.isPending}
              onView={handleViewDocument}
              onUploadPress={setSourcePickerFor}
            />
            <StaffVerificationCard
              isApproved={!!tailor.is_approved}
              kycCount={kycCount}
              loading={approvalMutation.isPending}
              onToggle={handleToggleVerification}
              subjectLabel="tailor"
            />
          </View>
        ) : null}

        {activeTab === 'activity' ? <StaffActivityTab orders={orders} isLoading={ordersLoading} /> : null}
      </ScreenContent>

      <StaffDocumentPickerSheet
        visible={!!sourcePickerFor}
        onClose={() => setSourcePickerFor(null)}
        onPickPhoto={() => sourcePickerFor && handlePickPhoto(sourcePickerFor)}
        onPickDocument={() => sourcePickerFor && handlePickDocument(sourcePickerFor)}
      />

      <StaffStatusFilterSheet
        visible={statusPickerVisible}
        onClose={() => setStatusPickerVisible(false)}
        options={ORDER_STATUS_OPTIONS}
        value={ordersStatus}
        onSelect={(value) => {
          setOrdersStatus(value);
          setOrdersPage(1);
          setStatusPickerVisible(false);
        }}
      />

      <DocumentPreviewModal url={previewUrl} onClose={() => setPreviewUrl(null)} />

      <ConfirmModal
        visible={deleteConfirmVisible}
        title="Delete Tailor?"
        message={`This action cannot be undone. All data for ${tailor.full_name ?? 'this tailor'} will be permanently removed.`}
        confirmLabel="Yes, Delete"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmVisible(false)}
      />
    </View>
  );
}
