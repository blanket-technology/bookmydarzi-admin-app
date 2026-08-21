import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Switch, Text, View } from 'react-native';
import { z } from 'zod';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Header,
  Input,
  Loader,
  PasswordInput,
  Pressable,
  ScreenContent,
} from '@/components/ui';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import { useMyEarningsSummary } from '@/features/orders/hooks/useMyEarningsSummary';
import { ChangeEmailSheet } from '@/features/settings/components/ChangeEmailSheet';
import { ChangeMobileSheet } from '@/features/settings/components/ChangeMobileSheet';
import {
  useChangePasswordMutation,
  useProfile,
  useUpdateProfileMutation,
  useUploadProfilePhotoMutation,
} from '@/features/settings/hooks/useProfile';
import {
  useMyBridgeProfile,
  useUpdateMyBridgeProfileMutation,
} from '@/features/staff/hooks/useBridgeProfile';
import {
  useDeleteMyKycMutation,
  useMyKycStatus,
  useUploadMyKycMutation,
} from '@/features/staff/hooks/useKyc';
import {
  useMyTailorProfile,
  useUpdateMyTailorProfileMutation,
} from '@/features/tailors/hooks/useTailors';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { formatCurrency, getMutationError } from '@/utils/errors';

const profileSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const tailorProfileSchema = z.object({
  specialization: z.string().optional(),
  experience: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
});

const bridgeProfileSchema = z.object({
  experienceYears: z.string().optional(),
  bridgeType: z.string().optional(),
  assignedArea: z.string().optional(),
  vehicleType: z.string().optional(),
  workingShift: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type TailorProfileForm = z.infer<typeof tailorProfileSchema>;
type BridgeProfileForm = z.infer<typeof bridgeProfileSchema>;

// ─── Settings-list row — tappable "Email" / "Mobile" / "Password" style
// entries, matching the icon-left / value+chevron-right pattern almost
// every major app (Google, banking apps, etc.) uses for account security
// settings, instead of the previous bare "Change Password" button with no
// visible current value for email/mobile.
function SettingsRow({
  icon,
  label,
  value,
  onPress,
  verified,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  onPress: () => void;
  verified?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      pressScale={0.98}
      className="flex-row items-center py-3.5"
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          {label}
        </Text>
        <View className="flex-row items-center mt-0.5">
          <Text className="text-xs" style={{ color: colors.textMuted }} numberOfLines={1}>
            {value || 'Not set'}
          </Text>
          {verified ? (
            <Ionicons name="checkmark-circle" size={12} color={colors.success} style={{ marginLeft: 4 }} />
          ) : null}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── Shared "earnings" summary card — tailor and employee both derive this ──
// from their own completed orders, since neither role has a real payout/
// commission ledger on the backend today (see useMyEarningsSummary's
// comment for why this is honestly labeled as a derived total, not a
// payout figure).
function EarningsSummaryCard() {
  const { colors } = useTheme();
  const { completedCount, totalValue, isPartial, sampledCount, isLoading, isError, refetch } =
    useMyEarningsSummary();

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          Earnings
        </Text>
        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
      </View>

      {isLoading ? (
        <Loader message="Loading…" />
      ) : isError ? (
        <View className="items-center py-4">
          <Text className="text-sm mb-2" style={{ color: colors.textMuted }}>
            Failed to load earnings
          </Text>
          <Button title="Retry" size="sm" variant="outline" onPress={() => refetch()} />
        </View>
      ) : (
        <>
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: colors.primaryLight }}>
              <Text className="text-xl font-bold" style={{ color: colors.primary }}>
                {formatCurrency(totalValue)}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                {isPartial ? `From last ${sampledCount} completed orders` : 'Completed order value'}
              </Text>
            </View>
            <View className="flex-1 rounded-2xl p-3.5" style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }}>
              <Text className="text-xl font-bold" style={{ color: colors.text }}>
                {completedCount}
              </Text>
              <Text className="text-[11px] mt-0.5" style={{ color: colors.textSecondary }}>
                Completed Orders
              </Text>
            </View>
          </View>
          <Text className="text-[11px] mt-3" style={{ color: colors.textMuted }}>
            Total value of orders you completed, not a payout or commission figure — talk to your
            admin for actual payment/incentive amounts.
          </Text>
        </>
      )}
    </Card>
  );
}

// ─── KYC status/upload — shared by Tailor and Bridge/employee (identical
// document set: aadhar/pan_card/other), backed by GET/POST/DELETE .../me/kyc
// (app/services/staff/kyc_self_service.py). Previously KYC was entirely
// admin-managed with no way for a tailor/Bridge account to see which docs
// are missing or replace one themselves.
const KYC_DOCS: { type: 'aadhar' | 'pan_card' | 'other'; label: string }[] = [
  { type: 'aadhar', label: 'Aadhaar Card' },
  { type: 'pan_card', label: 'PAN Card' },
  { type: 'other', label: 'Other Document' },
];

function KycStatusCard({ role }: { role: 'tailor' | 'employee' }) {
  const { colors } = useTheme();
  const { data: kyc, isLoading } = useMyKycStatus(role);
  const uploadMutation = useUploadMyKycMutation(role);
  const deleteMutation = useDeleteMyKycMutation(role);
  const [activeDoc, setActiveDoc] = useState<'aadhar' | 'pan_card' | 'other' | null>(null);

  const urlFor = (type: 'aadhar' | 'pan_card' | 'other') =>
    type === 'aadhar' ? kyc?.aadhaar_url : type === 'pan_card' ? kyc?.pan_card_url : kyc?.other_doc_url;

  const pickAndUpload = async (type: 'aadhar' | 'pan_card' | 'other') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setActiveDoc(type);
    uploadMutation.mutate(
      {
        documentType: type,
        file: { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      },
      { onSettled: () => setActiveDoc(null) },
    );
  };

  const removeDoc = (type: 'aadhar' | 'pan_card' | 'other') => {
    setActiveDoc(type);
    deleteMutation.mutate(type, { onSettled: () => setActiveDoc(null) });
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Loader message="Loading KYC status…" />
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          KYC Documents
        </Text>
        <Badge
          label={kyc?.is_approved ? 'Verified' : 'Pending verification'}
          backgroundColor={kyc?.is_approved ? '#dcfce7' : '#fef3c7'}
          color={kyc?.is_approved ? '#16a34a' : '#d97706'}
        />
      </View>
      <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
        Upload all 3 documents to become eligible for verification by your admin.
      </Text>

      {KYC_DOCS.map((doc) => {
        const url = urlFor(doc.type);
        const isBusy = activeDoc === doc.type && (uploadMutation.isPending || deleteMutation.isPending);
        return (
          <View
            key={doc.type}
            className="flex-row items-center py-2.5 border-b"
            style={{ borderColor: colors.border }}
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: url ? '#dcfce7' : colors.surface }}
            >
              <Ionicons
                name={url ? 'checkmark-circle' : 'document-outline'}
                size={18}
                color={url ? '#16a34a' : colors.textMuted}
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold" style={{ color: colors.text }}>
                {doc.label}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {url ? 'Uploaded' : 'Not uploaded'}
              </Text>
            </View>
            {isBusy ? (
              <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
            ) : url ? (
              <Pressable onPress={() => removeDoc(doc.type)} hitSlop={8} className="mr-2">
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            ) : null}
            {!isBusy ? (
              <Pressable onPress={() => pickAndUpload(doc.type)} hitSlop={8}>
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  {url ? 'Replace' : 'Upload'}
                </Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </Card>
  );
}

// ─── Tailor-specific profile section ────────────────────────────────────────
function TailorProfileSection() {
  const { colors } = useTheme();
  const { data: tailorProfile, isLoading } = useMyTailorProfile();
  const updateMutation = useUpdateMyTailorProfileMutation();
  const [isAvailable, setIsAvailable] = useState(true);

  const form = useForm<TailorProfileForm>({
    resolver: zodResolver(tailorProfileSchema),
    values: {
      specialization: tailorProfile?.Specialization ?? '',
      experience: tailorProfile?.Experience != null ? String(tailorProfile.Experience) : '',
      location: tailorProfile?.Location ?? '',
      bio: tailorProfile?.Bio ?? '',
    },
  });

  useEffect(() => {
    if (tailorProfile) setIsAvailable(tailorProfile.IsAvailable);
  }, [tailorProfile]);

  const onSave = (data: TailorProfileForm) => {
    updateMutation.mutate({
      specialization: data.specialization?.trim() || undefined,
      experience: data.experience ? Number(data.experience) : undefined,
      location: data.location?.trim() || undefined,
      bio: data.bio?.trim() || undefined,
      is_available: isAvailable,
    });
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Loader message="Loading tailoring profile…" />
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            Tailoring Profile
          </Text>
          {tailorProfile?.Rating != null ? (
            <View className="flex-row items-center">
              <Ionicons name="star" size={14} color="#d97706" />
              <Text className="text-sm font-semibold ml-1" style={{ color: colors.text }}>
                {tailorProfile.Rating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <Controller
          control={form.control}
          name="specialization"
          render={({ field: { onChange, value } }) => (
            <Input label="Specialization" placeholder="e.g. Bridal wear, Sherwani" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="experience"
          render={({ field: { onChange, value } }) => (
            <Input label="Experience (years)" keyboardType="number-pad" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <Input label="Location" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="bio"
          render={({ field: { onChange, value } }) => (
            <Input label="Bio" multiline numberOfLines={3} value={value} onChangeText={onChange} />
          )}
        />

        <View className="flex-row items-center justify-between py-2 mb-3">
          <View>
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              Available for new orders
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Turn off if you're at capacity — separate from your online/broadcast status.
            </Text>
          </View>
          <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
        </View>

        <Button
          title="Save Changes"
          onPress={form.handleSubmit(onSave)}
          loading={updateMutation.isPending}
          fullWidth
        />
      </Card>

      <PortfolioSection images={tailorProfile?.PortfolioImages ?? []} />

      <KycStatusCard role="tailor" />

      <EarningsSummaryCard />
    </>
  );
}

// ─── Tailor portfolio images — PATCH /tailors/me's portfolio_images field
// (app/schemas/tailor.py) had no UI anywhere (web or mobile) despite the
// backend supporting it since before this session. Reuses the same generic
// POST /users/profile/photo upload endpoint every profile photo upload
// already goes through (returns a URL; the only "portfolio" behavior is
// this screen accumulating multiple URLs into one array instead of setting
// a single field).
const MAX_PORTFOLIO_IMAGES = 12;

function PortfolioSection({ images }: { images: string[] }) {
  const { colors } = useTheme();
  const uploadMutation = useUploadProfilePhotoMutation();
  const updateMutation = useUpdateMyTailorProfileMutation();
  const [removing, setRemoving] = useState<string | null>(null);

  const atLimit = images.length >= MAX_PORTFOLIO_IMAGES;

  const pickAndAdd = async () => {
    if (atLimit) {
      toast.error(`You can add up to ${MAX_PORTFOLIO_IMAGES} portfolio images`);
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    uploadMutation.mutate(
      { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      {
        onSuccess: (uploaded) => {
          updateMutation.mutate(
            { portfolio_images: [...images, uploaded.profile_image_url] },
            { onError: (error) => toast.error(getMutationError(error)) },
          );
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const removeImage = (url: string) => {
    setRemoving(url);
    updateMutation.mutate(
      { portfolio_images: images.filter((img) => img !== url) },
      { onSettled: () => setRemoving(null) },
    );
  };

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          Portfolio
        </Text>
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {images.length}/{MAX_PORTFOLIO_IMAGES}
        </Text>
      </View>
      <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
        Photos of your past work — shown to customers browsing tailors.
      </Text>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {images.map((url) => (
          <View key={url} style={{ width: '31%', aspectRatio: 1 }}>
            <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
            <Pressable
              onPress={() => removeImage(url)}
              disabled={removing === url}
              className="absolute top-1 right-1 w-6 h-6 rounded-full items-center justify-center"
              style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
            >
              <Ionicons name={removing === url ? 'hourglass-outline' : 'close'} size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {!atLimit ? (
          <Pressable
            onPress={pickAndAdd}
            disabled={uploadMutation.isPending}
            className="rounded-xl items-center justify-center"
            style={{
              width: '31%',
              aspectRatio: 1,
              borderWidth: 2,
              borderStyle: 'dashed',
              borderColor: colors.border,
            }}
          >
            <Ionicons
              name={uploadMutation.isPending ? 'hourglass-outline' : 'add'}
              size={24}
              color={colors.textMuted}
            />
          </Pressable>
        ) : null}
      </View>
    </Card>
  );
}

// ─── Employee-specific profile section ──────────────────────────────────────
// PATCH /employee/me/bridge-profile (app/api/v1/endpoints/employee.py) lets
// Bridge self-edit experience/bridge-type/assigned-area/vehicle/shift.
// Joining date, max orders/day, and earnings stay admin-only (PATCH
// /admin/staff/{id}/bridge-profile) - not editable here. KYC document
// upload IS self-service (see KycStatusCard below) - only the final
// verification approval stays admin-only.
function EmployeeProfileSection() {
  const { colors } = useTheme();
  const { data: bridgeProfile, isLoading } = useMyBridgeProfile();
  const updateMutation = useUpdateMyBridgeProfileMutation();

  const form = useForm<BridgeProfileForm>({
    resolver: zodResolver(bridgeProfileSchema),
    values: {
      experienceYears: bridgeProfile?.experience_years != null ? String(bridgeProfile.experience_years) : '',
      bridgeType: bridgeProfile?.bridge_type ?? '',
      assignedArea: bridgeProfile?.assigned_area ?? '',
      vehicleType: bridgeProfile?.vehicle_type ?? '',
      workingShift: bridgeProfile?.working_shift ?? '',
    },
  });

  const onSave = (data: BridgeProfileForm) => {
    updateMutation.mutate({
      experience_years: data.experienceYears ? Number(data.experienceYears) : undefined,
      bridge_type: data.bridgeType?.trim() || undefined,
      assigned_area: data.assignedArea?.trim() || undefined,
      vehicle_type: data.vehicleType?.trim() || undefined,
      working_shift: data.workingShift?.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card className="mb-4">
        <Loader message="Loading work profile…" />
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            Work Profile
          </Text>
          <Badge
            label={bridgeProfile?.is_approved ? 'Verified' : 'Pending verification'}
            backgroundColor={bridgeProfile?.is_approved ? '#dcfce7' : '#fef3c7'}
            color={bridgeProfile?.is_approved ? '#16a34a' : '#d97706'}
          />
        </View>

        <Controller
          control={form.control}
          name="experienceYears"
          render={({ field: { onChange, value } }) => (
            <Input label="Experience (years)" keyboardType="number-pad" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="bridgeType"
          render={({ field: { onChange, value } }) => (
            <Input label="Bridge type" placeholder="e.g. full_time, freelancer" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="assignedArea"
          render={({ field: { onChange, value } }) => (
            <Input label="Assigned area" placeholder="e.g. Andheri West" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="vehicleType"
          render={({ field: { onChange, value } }) => (
            <Input label="Vehicle type" placeholder="e.g. Bike, Scooter" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="workingShift"
          render={({ field: { onChange, value } }) => (
            <Input label="Working shift" placeholder="e.g. 9:00 AM - 7:00 PM" value={value} onChangeText={onChange} />
          )}
        />

        <Button
          title="Save Changes"
          onPress={form.handleSubmit(onSave)}
          loading={updateMutation.isPending}
          fullWidth
        />
      </Card>

      <Card className="mb-4 flex-row items-start">
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginTop: 1 }} />
        <Text className="text-xs ml-2 flex-1" style={{ color: colors.textSecondary }}>
          Joining date, max orders/day, and earnings are managed by your admin.
        </Text>
      </Card>

      <KycStatusCard role="employee" />

      <EarningsSummaryCard />
    </>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateMutation = useUpdateProfileMutation();
  const passwordMutation = useChangePasswordMutation();
  const uploadPhotoMutation = useUploadProfilePhotoMutation();
  const logoutMutation = useLogoutMutation();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);
  const [mobileSheetVisible, setMobileSheetVisible] = useState(false);

  const pickAndUploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error('Photo library permission is required');
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
    uploadPhotoMutation.mutate(
      { uri: asset.uri, fileName: asset.fileName ?? undefined, mimeType: asset.mimeType ?? 'image/jpeg' },
      {
        onSuccess: () => toast.success('Profile photo updated'),
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const normalizedRole = String(user?.role ?? '').toLowerCase();
  const isTailor = normalizedRole === 'tailor';
  const isEmployee = normalizedRole === 'employee';

  const roleLabel = profile?.Role ?? user?.role ?? '';
  // FullName is computed server-side from FirstName+LastName and comes back
  // null/empty for any account provisioned without a name (some admin-added
  // staff/tailor accounts). Previously fell straight through to the literal
  // string "Admin" regardless of actual role - fall back to the role label
  // instead, which is at least true, and only as a last resort.
  const displayName =
    profile?.FullName?.trim() ||
    user?.full_name?.trim() ||
    (roleLabel ? `${roleLabel.charAt(0).toUpperCase()}${roleLabel.slice(1)} Account` : 'Your Account');
  const hasRealName = Boolean(profile?.FullName?.trim() || user?.full_name?.trim());

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: profile?.FirstName ?? user?.first_name ?? '',
      lastName: profile?.LastName ?? user?.last_name ?? '',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onUpdateProfile = (data: ProfileForm) => {
    updateMutation.mutate(
      { FirstName: data.firstName, LastName: data.lastName },
      {
        onSuccess: () => toast.success('Profile updated'),
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const onChangePassword = (data: PasswordForm) => {
    passwordMutation.mutate(
      { old_password: data.oldPassword, new_password: data.newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed successfully');
          passwordForm.reset();
          setShowPasswordForm(false);
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Profile" subtitle="Manage your account" />
      <ScreenContent>
        {/* Hero card - avatar, name, role pill, quick-glance contact info.
            Bigger avatar + centered layout mirrors the "identity card" hero
            pattern most major apps (Google, banking apps) lead a profile
            screen with, instead of the previous plain stacked text. */}
        <Card className="items-center mb-4 pt-6 pb-5">
          <Pressable onPress={pickAndUploadPhoto} disabled={uploadPhotoMutation.isPending}>
            <View>
              <View
                className="rounded-full"
                style={{
                  padding: 3,
                  borderWidth: 2,
                  borderColor: colors.primaryLight,
                }}
              >
                <Avatar
                  name={hasRealName ? displayName : undefined}
                  imageUrl={profile?.ProfileImageUrl}
                  size={92}
                />
              </View>
              <View
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center border-2"
                style={{ backgroundColor: colors.primary, borderColor: colors.card }}
              >
                <Ionicons
                  name={uploadPhotoMutation.isPending ? 'hourglass-outline' : 'camera'}
                  size={15}
                  color="#fff"
                />
              </View>
            </View>
          </Pressable>

          <Text className="text-2xl font-bold mt-4 text-center" style={{ color: colors.text }}>
            {displayName}
          </Text>
          {!hasRealName ? (
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              Add your name below
            </Text>
          ) : null}

          <View className="flex-row items-center mt-2">
            <Badge
              label={roleLabel || '—'}
              backgroundColor={colors.primaryLight}
              color={colors.primary}
            />
            {profile?.UserCode ? (
              <Text className="text-xs ml-2" style={{ color: colors.textMuted }}>
                {profile.UserCode}
              </Text>
            ) : null}
          </View>

          <View className="w-full mt-5 pt-4 border-t" style={{ borderColor: colors.border }}>
            <View className="flex-row items-center justify-center">
              <Ionicons name="mail-outline" size={14} color={colors.textMuted} />
              <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }} numberOfLines={1}>
                {profile?.Email ?? user?.email ?? 'No email set'}
              </Text>
              {profile?.IsEmailVerified ? (
                <Ionicons name="checkmark-circle" size={13} color={colors.success} style={{ marginLeft: 4 }} />
              ) : null}
            </View>
            {(profile?.Mobile ?? user?.mobile) ? (
              <View className="flex-row items-center justify-center mt-1.5">
                <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                <Text className="text-sm ml-1.5" style={{ color: colors.textSecondary }}>
                  {profile?.Mobile ?? user?.mobile}
                </Text>
                {profile?.IsMobileVerified ? (
                  <Ionicons name="checkmark-circle" size={13} color={colors.success} style={{ marginLeft: 4 }} />
                ) : null}
              </View>
            ) : null}
          </View>
        </Card>

        {isTailor ? <TailorProfileSection /> : null}
        {isEmployee ? <EmployeeProfileSection /> : null}

        {/* Account & Security - settings-list rows for the things that need
            their own verification flow (email/mobile), separate from the
            plain name-edit form below. */}
        <Card className="mb-4">
          <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
            Account & Security
          </Text>
          <View className="divide-y" style={{ borderColor: colors.border }}>
            <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
              <SettingsRow
                icon="mail-outline"
                label="Email Address"
                value={profile?.Email ?? user?.email}
                verified={profile?.IsEmailVerified}
                onPress={() => setEmailSheetVisible(true)}
              />
            </View>
            <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
              <SettingsRow
                icon="call-outline"
                label="Mobile Number"
                value={profile?.Mobile ?? user?.mobile}
                verified={profile?.IsMobileVerified}
                onPress={() => setMobileSheetVisible(true)}
              />
            </View>
            <SettingsRow
              icon="lock-closed-outline"
              label="Password"
              value="••••••••"
              onPress={() => setShowPasswordForm((prev) => !prev)}
            />
          </View>

          {showPasswordForm ? (
            <View className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
              <Controller
                control={passwordForm.control}
                name="oldPassword"
                render={({ field: { onChange, value } }) => (
                  <PasswordInput label="Current Password" value={value} onChangeText={onChange} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field: { onChange, value } }) => (
                  <PasswordInput label="New Password" value={value} onChangeText={onChange} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field: { onChange, value } }) => (
                  <PasswordInput label="Confirm Password" value={value} onChangeText={onChange} />
                )}
              />
              <Button
                title="Update Password"
                onPress={passwordForm.handleSubmit(onChangePassword)}
                loading={passwordMutation.isPending}
                fullWidth
              />
            </View>
          ) : null}
        </Card>

        <Card className="mb-4">
          <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            Personal Details
          </Text>
          <Controller
            control={profileForm.control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <Input label="First Name" value={value} onChangeText={onChange} />
            )}
          />
          <Controller
            control={profileForm.control}
            name="lastName"
            render={({ field: { onChange, value } }) => (
              <Input label="Last Name" value={value} onChangeText={onChange} />
            )}
          />
          <Button
            title="Save Changes"
            onPress={profileForm.handleSubmit(onUpdateProfile)}
            loading={updateMutation.isPending}
            fullWidth
          />
        </Card>

        <Button
          title="Logout"
          variant="danger"
          onPress={() => logoutMutation.mutate()}
          loading={logoutMutation.isPending}
          fullWidth
          className="mb-8"
        />
      </ScreenContent>

      <ChangeEmailSheet
        visible={emailSheetVisible}
        onClose={() => setEmailSheetVisible(false)}
        hasExistingEmail={Boolean(profile?.Email ?? user?.email)}
      />
      <ChangeMobileSheet visible={mobileSheetVisible} onClose={() => setMobileSheetVisible(false)} />
    </View>
  );
}
