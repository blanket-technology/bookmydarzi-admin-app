import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, ConfirmModal, DocumentPreviewModal, EmptyState, Header, Input, Loader, Pressable, ScreenContent, Tabs, type TabItem } from '@/components/ui';
import { useOrders } from '@/features/orders/hooks/useOrders';
import {
  useSetBridgeVerificationMutation,
  useStaffMember,
  useUpdateBridgeProfileMutation,
  useUpdateStaffMutation,
  useUploadStaffKycMutation,
} from '@/features/staff/hooks/useStaff';
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
import { useUpdateUserStatusMutation, useUploadUserPhotoMutation } from '@/features/users/hooks/useUsers';
import { useTheme } from '@/hooks/useTheme';
import type { BridgeProfileUpdateRequest, StaffUpdateRequest } from '@/types/staff';
import { isPdfUrl, resolveDocUrl } from '@/utils/documents';
import { formatCurrency, formatDate } from '@/utils/errors';
import { isValidEmail, isValidMobile } from '@/utils/validation';

const BRIDGE_TYPE_LABEL: Record<string, string> = {
  full_time: 'Full Time',
  freelancer: 'Freelancer',
};

const TABS: TabItem[] = [
  { id: 'overview', label: 'Overview', icon: 'grid-outline' },
  { id: 'orders', label: 'Orders', icon: 'receipt-outline' },
  { id: 'performance', label: 'Performance', icon: 'stats-chart-outline' },
  { id: 'documents', label: 'Documents', icon: 'document-text-outline' },
  { id: 'activity', label: 'Activity', icon: 'time-outline' },
];

const ORDER_STATUS_OPTIONS: StaffOrderStatusOption[] = [
  { value: '', label: 'All' },
  { value: 'order_accepted', label: 'Accepted' },
  { value: 'pickup_scheduled', label: 'Pickup Scheduled' },
  { value: 'picked_up', label: 'Picked Up' },
  { value: 'ready_for_dispatch', label: 'Ready for Dispatch' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const ORDERS_LIMIT = 10;

export default function StaffDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { data: staff, isLoading, isError } = useStaffMember(id);
  const updateStaffMutation = useUpdateStaffMutation(id);
  const updateBridgeProfileMutation = useUpdateBridgeProfileMutation(id);
  const verificationMutation = useSetBridgeVerificationMutation(id);
  const statusMutation = useUpdateUserStatusMutation();
  const uploadKycMutation = useUploadStaffKycMutation(id);
  const uploadPhotoMutation = useUploadUserPhotoMutation(id, [['staff', id], ['staff']]);

  const [activeTab, setActiveTab] = useState('overview');
  const [editMode, setEditMode] = useState(false);
  const [statusConfirmVisible, setStatusConfirmVisible] = useState(false);
  const [sourcePickerFor, setSourcePickerFor] = useState<KycDocKey | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersStatus, setOrdersStatus] = useState('');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  const [accountForm, setAccountForm] = useState<{
    full_name: string;
    email: string;
    mobile: string;
    isActive: boolean;
  } | null>(null);
  const [profileForm, setProfileForm] = useState<{
    experience_years: string;
    bridge_type: string;
    assigned_area: string;
    vehicle_type: string;
    working_shift: string;
    max_orders_per_day: string;
    total_earnings: string;
    incentives_earned: string;
  } | null>(null);

  const isEmployee = staff?.role === 'employee';

  const {
    data: ordersData,
    isLoading: ordersLoading,
    isError: ordersIsError,
    refetch: refetchOrders,
  } = useOrders(
    { employee_id: id, page: ordersPage, limit: ORDERS_LIMIT, status: ordersStatus || undefined },
    !!id && isEmployee,
  );
  const orders = ordersData?.orders ?? [];
  const ordersTotal = ordersData?.total ?? 0;
  const ordersTotalPages = Math.max(1, Math.ceil(ordersTotal / ORDERS_LIMIT));

  const startEdit = () => {
    if (!staff) return;
    setAccountForm({
      full_name: staff.full_name ?? '',
      email: staff.email ?? '',
      mobile: staff.mobile ?? '',
      isActive: staff.is_active,
    });
    setProfileForm({
      experience_years: staff.bridge_professional_details?.experience_years != null
        ? String(staff.bridge_professional_details.experience_years)
        : '',
      bridge_type: staff.bridge_professional_details?.bridge_type ?? '',
      assigned_area: staff.bridge_professional_details?.assigned_area ?? '',
      vehicle_type: staff.bridge_professional_details?.vehicle_type ?? '',
      working_shift: staff.bridge_professional_details?.working_shift ?? '',
      max_orders_per_day: staff.bridge_professional_details?.max_orders_per_day != null
        ? String(staff.bridge_professional_details.max_orders_per_day)
        : '',
      total_earnings: staff.bridge_earnings?.total_earnings != null
        ? String(staff.bridge_earnings.total_earnings)
        : '',
      incentives_earned: staff.bridge_earnings?.incentives_earned != null
        ? String(staff.bridge_earnings.incentives_earned)
        : '',
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setAccountForm(null);
    setProfileForm(null);
  };

  const handleSave = async () => {
    if (!accountForm) return;
    if (accountForm.email.trim() && !isValidEmail(accountForm.email)) return;
    if (accountForm.mobile.trim() && !isValidMobile(accountForm.mobile)) return;
    // Backend's StaffUpdateRequest is first_name/last_name (distinct from
    // AdminTailorUpdateRequest's single full_name — a real inconsistency
    // between the two admin schemas) - split only at the API boundary so
    // the form itself matches the Tailor edit screen's single "Full Name"
    // field exactly.
    const [firstName, ...rest] = accountForm.full_name.trim().split(' ');
    const accountPayload: StaffUpdateRequest = {
      first_name: firstName || undefined,
      last_name: rest.join(' ') || undefined,
      email: accountForm.email.trim() || undefined,
      mobile: accountForm.mobile.trim() || undefined,
      is_active: accountForm.isActive,
    };
    updateStaffMutation.mutate(accountPayload, {
      onSuccess: () => {
        if (isEmployee && profileForm) {
          const profilePayload: BridgeProfileUpdateRequest = {
            experience_years: profileForm.experience_years ? Number(profileForm.experience_years) : undefined,
            bridge_type: profileForm.bridge_type || undefined,
            assigned_area: profileForm.assigned_area.trim() || undefined,
            vehicle_type: profileForm.vehicle_type.trim() || undefined,
            working_shift: profileForm.working_shift.trim() || undefined,
            max_orders_per_day: profileForm.max_orders_per_day ? Number(profileForm.max_orders_per_day) : undefined,
            total_earnings: profileForm.total_earnings ? Number(profileForm.total_earnings) : undefined,
            incentives_earned: profileForm.incentives_earned ? Number(profileForm.incentives_earned) : undefined,
          };
          updateBridgeProfileMutation.mutate(profilePayload, {
            onSuccess: () => {
              setEditMode(false);
              setAccountForm(null);
              setProfileForm(null);
            },
          });
        } else {
          setEditMode(false);
          setAccountForm(null);
        }
      },
    });
  };

  const handleConfirmStatus = () => {
    if (!staff) return;
    const action = staff.is_active ? 'deactivate' : 'activate';
    statusMutation.mutate(
      { userId: staff.id, payload: { action } },
      { onSuccess: () => setStatusConfirmVisible(false) },
    );
  };

  const handleToggleVerification = () => {
    if (!staff) return;
    verificationMutation.mutate(!staff.bridge_documents?.is_approved);
  };

  const handleViewDocument = (url?: string | null) => {
    const resolved = resolveDocUrl(url);
    if (!resolved) return;
    if (!isPdfUrl(resolved)) setPreviewUrl(resolved);
  };

  const handlePickAvatarPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
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
    if (!permission.granted) return;
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
  if (isError || !staff) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.background }}>
        <Header title="Staff Details" showMenu={false} />
        <EmptyState title="Staff not found" actionLabel="Go Back" onAction={() => router.back()} />
      </View>
    );
  }

  const kycCount = KYC_DOCS.filter((d) => !!staff.bridge_documents?.[d.urlField]).length;
  const visibleTabs = isEmployee ? TABS : TABS.filter((t) => ['overview', 'orders', 'activity'].includes(t.id));

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header
        title="Staff Details"
        showMenu={false}
        rightAction={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        }
      />

      <StaffDetailHero
        identity={{
          id: staff.id,
          fullName: staff.full_name,
          subtitleLine: `${staff.user_code ? `${staff.user_code} · ` : ''}${staff.email ?? '—'} · ${staff.mobile ?? '—'}`,
          profileImageUrl: staff.profile_image_url,
          isActive: staff.is_active,
          verification: isEmployee ? { isApproved: !!staff.bridge_documents?.is_approved } : null,
          factsLine:
            isEmployee && staff.bridge_professional_details?.bridge_type
              ? `${BRIDGE_TYPE_LABEL[staff.bridge_professional_details.bridge_type] ?? 'Type not set'}${
                  staff.bridge_professional_details.assigned_area ? ` · ${staff.bridge_professional_details.assigned_area}` : ''
                }`
              : null,
        }}
        editMode={editMode}
        onPickPhoto={handlePickAvatarPhoto}
        photoUploading={uploadPhotoMutation.isPending}
        actions={[
          { title: 'Edit', variant: 'outline', onPress: startEdit },
          {
            title: staff.is_active ? 'Deactivate' : 'Activate',
            variant: staff.is_active ? 'danger' : 'primary',
            onPress: () => setStatusConfirmVisible(true),
          },
        ]}
      />

      <View className="mt-3">
        <Tabs tabs={visibleTabs} activeTab={activeTab} onChange={setActiveTab} />
      </View>

      <ScreenContent>
        {editMode && accountForm ? (
          <Card className="mt-4 mb-4">
            <Text className="font-bold mb-3" style={{ color: colors.text }}>
              Account
            </Text>
            <Input
              label="Full Name"
              value={accountForm.full_name}
              onChangeText={(v) => setAccountForm((p) => (p ? { ...p, full_name: v } : p))}
            />
            <Input
              label="Email"
              value={accountForm.email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={(v) => setAccountForm((p) => (p ? { ...p, email: v } : p))}
              error={accountForm.email.trim() && !isValidEmail(accountForm.email) ? 'Enter a valid email' : undefined}
            />
            <Input
              label="Mobile"
              value={accountForm.mobile}
              keyboardType="phone-pad"
              onChangeText={(v) => setAccountForm((p) => (p ? { ...p, mobile: v } : p))}
              error={accountForm.mobile.trim() && !isValidMobile(accountForm.mobile) ? 'Enter a valid 10-digit mobile number' : undefined}
            />
            <Pressable
              onPress={() => setAccountForm((p) => (p ? { ...p, isActive: !p.isActive } : p))}
              className="flex-row items-center justify-between py-2"
            >
              <Text style={{ color: colors.text }}>Active</Text>
              <Text style={{ color: accountForm.isActive ? colors.success : colors.error }}>
                {accountForm.isActive ? 'Active' : 'Inactive'}
              </Text>
            </Pressable>

            {isEmployee && profileForm ? (
              <>
                <Text className="font-bold mb-3 mt-2" style={{ color: colors.text }}>
                  Professional Details
                </Text>
                <Input
                  label="Experience (years)"
                  value={profileForm.experience_years}
                  keyboardType="number-pad"
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, experience_years: v } : p))}
                />
                <Text className="text-xs font-semibold mb-2" style={{ color: colors.textSecondary }}>
                  Bridge Type
                </Text>
                <View className="flex-row gap-2 mb-4">
                  {(['full_time', 'freelancer'] as const).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setProfileForm((p) => (p ? { ...p, bridge_type: type } : p))}
                      className="flex-1 items-center py-2.5 rounded-xl border"
                      style={{
                        backgroundColor: profileForm.bridge_type === type ? colors.primary : colors.surface,
                        borderColor: profileForm.bridge_type === type ? colors.primary : colors.border,
                      }}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: profileForm.bridge_type === type ? '#fff' : colors.text }}
                      >
                        {BRIDGE_TYPE_LABEL[type]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <Input
                  label="Assigned Area"
                  value={profileForm.assigned_area}
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, assigned_area: v } : p))}
                />
                <Input
                  label="Vehicle Type"
                  value={profileForm.vehicle_type}
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, vehicle_type: v } : p))}
                />
                <Input
                  label="Working Shift"
                  placeholder="e.g. 9:00 AM - 7:00 PM"
                  value={profileForm.working_shift}
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, working_shift: v } : p))}
                />
                <Input
                  label="Max Orders / Day"
                  value={profileForm.max_orders_per_day}
                  keyboardType="number-pad"
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, max_orders_per_day: v } : p))}
                />
                <Input
                  label="Total Earnings (₹)"
                  value={profileForm.total_earnings}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, total_earnings: v } : p))}
                />
                <Input
                  label="Incentives Earned (₹)"
                  value={profileForm.incentives_earned}
                  keyboardType="decimal-pad"
                  onChangeText={(v) => setProfileForm((p) => (p ? { ...p, incentives_earned: v } : p))}
                />
              </>
            ) : null}

            <View className="flex-row gap-3 mt-3">
              <View className="flex-1">
                <Button title="Cancel" variant="outline" onPress={cancelEdit} fullWidth />
              </View>
              <View className="flex-1">
                <Button
                  title="Save Changes"
                  loading={updateStaffMutation.isPending || updateBridgeProfileMutation.isPending}
                  onPress={handleSave}
                  fullWidth
                />
              </View>
            </View>
          </Card>
        ) : null}

        {activeTab === 'overview' ? (
          <View className="mt-4 mb-8">
            {isEmployee ? (
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                <StaffKpiTile label="Today's Pickups" value={staff.bridge_delivery_performance?.todays_pickups ?? 0} />
                <StaffKpiTile label="Today's Deliveries" value={staff.bridge_delivery_performance?.todays_deliveries ?? 0} />
                <StaffKpiTile label="Active Orders" value={staff.bridge_workload?.current_active_orders ?? 0} />
                <StaffKpiTile label="Pending Pickups" value={staff.bridge_delivery_performance?.pending_pickups ?? 0} />
                <StaffKpiTile label="Pending Deliveries" value={staff.bridge_delivery_performance?.pending_deliveries ?? 0} />
              </View>
            ) : null}

            <Card className="mt-4">
              <StaffInfoRow label="Role" value={staff.role} capitalize />
              <StaffInfoRow label="Assigned Orders" value={String(staff.assigned_orders_count ?? 0)} />
              <StaffInfoRow label="Joined" value={formatDate(staff.created_at)} last={!isEmployee} />
              {isEmployee ? (
                <>
                  <StaffInfoRow
                    label="Bridge Type"
                    value={
                      staff.bridge_professional_details?.bridge_type
                        ? (BRIDGE_TYPE_LABEL[staff.bridge_professional_details.bridge_type] ?? '—')
                        : '—'
                    }
                  />
                  <StaffInfoRow label="Vehicle" value={staff.bridge_professional_details?.vehicle_type ?? '—'} />
                  <StaffInfoRow label="Working Shift" value={staff.bridge_professional_details?.working_shift ?? '—'} last />
                </>
              ) : null}
            </Card>

            {isEmployee ? (
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
            ) : null}
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

        {activeTab === 'performance' && isEmployee ? (
          <View className="mt-4 mb-8">
            <Text className="text-xs font-bold uppercase mb-2" style={{ color: colors.textMuted }}>
              Delivery Performance
            </Text>
            <Card className="mb-3">
              <StaffInfoRow label="Total Pickups" value={String(staff.bridge_delivery_performance?.total_pickups ?? 0)} />
              <StaffInfoRow label="Total Deliveries" value={String(staff.bridge_delivery_performance?.total_deliveries ?? 0)} />
              <StaffInfoRow label="Cancelled Orders" value={String(staff.bridge_delivery_performance?.cancelled_orders ?? 0)} />
              <StaffInfoRow label="Failed Deliveries" value={String(staff.bridge_delivery_performance?.failed_deliveries ?? 0)} last />
            </Card>

            <Text className="text-xs font-bold uppercase mb-2 mt-2" style={{ color: colors.textMuted }}>
              Performance Metrics
            </Text>
            <Card className="mb-3">
              <StaffInfoRow
                label="On-Time Delivery Rate"
                value={staff.bridge_performance_metrics?.on_time_delivery_rate != null ? `${staff.bridge_performance_metrics.on_time_delivery_rate}%` : '—'}
              />
              <StaffInfoRow
                label="Avg Delivery Time"
                value={staff.bridge_performance_metrics?.average_delivery_minutes != null ? `${staff.bridge_performance_metrics.average_delivery_minutes} min` : '—'}
              />
              <StaffInfoRow
                label="Customer Rating"
                value={staff.bridge_performance_metrics?.customer_rating != null ? `${staff.bridge_performance_metrics.customer_rating.toFixed(1)} / 5` : '—'}
              />
              <StaffInfoRow label="Completed Orders" value={String(staff.bridge_performance_metrics?.completed_orders ?? 0)} last />
            </Card>

            <Text className="text-xs font-bold uppercase mb-2 mt-2" style={{ color: colors.textMuted }}>
              Workload
            </Text>
            <Card className="mb-3">
              <StaffInfoRow label="Orders Assigned" value={String(staff.bridge_workload?.orders_assigned ?? 0)} />
              <StaffInfoRow label="Orders Accepted" value={String(staff.bridge_workload?.orders_accepted ?? 0)} />
              <StaffInfoRow label="Orders Rejected" value={String(staff.bridge_workload?.orders_rejected ?? 0)} />
              <StaffInfoRow label="Current Active Orders" value={String(staff.bridge_workload?.current_active_orders ?? 0)} last />
            </Card>

            <Text className="text-xs font-bold uppercase mb-2 mt-2" style={{ color: colors.textMuted }}>
              Earnings
            </Text>
            <Card>
              <StaffInfoRow label="Total Earnings" value={formatCurrency(staff.bridge_earnings?.total_earnings)} />
              <StaffInfoRow label="Incentives Earned" value={formatCurrency(staff.bridge_earnings?.incentives_earned)} last />
            </Card>
          </View>
        ) : null}

        {activeTab === 'documents' && isEmployee ? (
          <View className="mt-4 mb-8">
            <StaffKycCard
              documents={staff.bridge_documents ?? {}}
              uploading={uploadKycMutation.isPending}
              onView={handleViewDocument}
              onUploadPress={setSourcePickerFor}
            />
            <StaffVerificationCard
              isApproved={!!staff.bridge_documents?.is_approved}
              kycCount={kycCount}
              loading={verificationMutation.isPending}
              onToggle={handleToggleVerification}
              subjectLabel="account"
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
        visible={statusConfirmVisible}
        title={staff.is_active ? 'Deactivate Account' : 'Activate Account'}
        message={`Are you sure you want to ${staff.is_active ? 'deactivate' : 'activate'} ${staff.full_name ?? staff.email ?? 'this account'}?`}
        confirmLabel={staff.is_active ? 'Deactivate' : 'Activate'}
        loading={statusMutation.isPending}
        onConfirm={handleConfirmStatus}
        onCancel={() => setStatusConfirmVisible(false)}
      />
    </View>
  );
}
