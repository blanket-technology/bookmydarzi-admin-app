import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, Switch, Text, View } from 'react-native';
import { z } from 'zod';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Header,
  Input,
  Loader,
  Pressable,
  ScreenContent,
} from '@/components/ui';
import {
  useProfile,
  useUploadPortfolioImageMutation,
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
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

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

type TailorProfileForm = z.infer<typeof tailorProfileSchema>;
type BridgeProfileForm = z.infer<typeof bridgeProfileSchema>;

// ─── Lightweight link tile to the real My Earnings screen (the actual
// payout ledger - TailorPayout/BridgePayout) - replaces the old inline
// derived-approximation card that used to live here directly.
function EarningsLinkTile() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  return (
    <Pressable
      onPress={() => router.push('/(drawer)/my-earnings' as never)}
      pressScale={0.98}
      className="flex-row items-center mb-4 rounded-3xl p-4 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <View
        className="w-10 h-10 rounded-full items-center justify-center mr-3"
        style={{ backgroundColor: colors.primaryLight }}
      >
        <Ionicons name="wallet-outline" size={18} color={colors.primary} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold" style={{ color: colors.text }}>
          {t('profile.earnings')}
        </Text>
        <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
          View your real payout history
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

// ─── KYC status/upload — shared by Tailor and Bridge/employee (identical
// document set: aadhar/pan_card/other), backed by GET/POST/DELETE .../me/kyc
// (app/services/staff/kyc_self_service.py). Previously KYC was entirely
// admin-managed with no way for a tailor/Bridge account to see which docs
// are missing or replace one themselves.
const KYC_DOCS: { type: 'aadhar' | 'pan_card' | 'other'; labelKey: string }[] = [
  { type: 'aadhar', labelKey: 'profile.aadhaarCard' },
  { type: 'pan_card', labelKey: 'profile.panCard' },
  { type: 'other', labelKey: 'profile.otherDocument' },
];

function KycStatusCard({ role }: { role: 'tailor' | 'employee' }) {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { data: kyc, isLoading } = useMyKycStatus(role);
  const uploadMutation = useUploadMyKycMutation(role);
  const deleteMutation = useDeleteMyKycMutation(role);
  const [activeDoc, setActiveDoc] = useState<'aadhar' | 'pan_card' | 'other' | null>(null);

  const urlFor = (type: 'aadhar' | 'pan_card' | 'other') =>
    type === 'aadhar' ? kyc?.aadhaar_url : type === 'pan_card' ? kyc?.pan_card_url : kyc?.other_doc_url;

  const pickAndUpload = async (type: 'aadhar' | 'pan_card' | 'other') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('profile.photoPermissionRequired'));
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
        <Loader message={t('profile.loadingKyc')} />
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <View className="flex-row items-center justify-between mb-1">
        <Text className="text-lg font-bold" style={{ color: colors.text }}>
          {t('profile.kycDocuments')}
        </Text>
        <Badge
          label={kyc?.is_approved ? t('profile.verified') : t('profile.pendingVerification')}
          backgroundColor={kyc?.is_approved ? '#dcfce7' : '#fef3c7'}
          color={kyc?.is_approved ? '#16a34a' : '#d97706'}
        />
      </View>
      <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
        {t('profile.kycUploadHint')}
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
                {t(doc.labelKey)}
              </Text>
              <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
                {url ? t('profile.uploaded') : t('profile.notUploaded')}
              </Text>
            </View>
            {isBusy ? (
              <Ionicons name="hourglass-outline" size={18} color={colors.textMuted} />
            ) : url ? (
              <Pressable
                onPress={() =>
                  Alert.alert(t('profile.removeDocTitle'), t('profile.removeDocBody'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    { text: t('profile.removeDoc'), style: 'destructive', onPress: () => removeDoc(doc.type) },
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel={t('profile.removeDoc')}
                hitSlop={12}
                className="mr-2"
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            ) : null}
            {!isBusy ? (
              <Pressable onPress={() => pickAndUpload(doc.type)} hitSlop={8}>
                <Text className="text-sm font-semibold" style={{ color: colors.primary }}>
                  {url ? t('profile.replace') : t('profile.upload')}
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
  const { t } = useAppLanguage();
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
        <Loader message={t('profile.loadingTailoringProfile')} />
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            {t('profile.tailoringProfile')}
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
            <Input label={t('profile.specialization')} placeholder={t('profile.specializationPlaceholder')} value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="experience"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.experienceYears')} keyboardType="number-pad" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.location')} value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="bio"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.bio')} multiline numberOfLines={3} value={value} onChangeText={onChange} />
          )}
        />

        <View className="flex-row items-center justify-between py-2 mb-3">
          <View>
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {t('profile.availableForOrders')}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              {t('profile.availableForOrdersHint')}
            </Text>
          </View>
          <Switch value={isAvailable} onValueChange={setIsAvailable} trackColor={{ true: colors.primary }} />
        </View>

        <Button
          title={t('profile.saveChanges')}
          onPress={() => void form.handleSubmit(onSave)()}
          loading={updateMutation.isPending}
          fullWidth
        />
      </Card>

      <PortfolioSection images={tailorProfile?.PortfolioImages ?? []} />

      <KycStatusCard role="tailor" />

      <EarningsLinkTile />
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
  const { t } = useAppLanguage();
  const uploadMutation = useUploadPortfolioImageMutation();
  const updateMutation = useUpdateMyTailorProfileMutation();
  const [removing, setRemoving] = useState<string | null>(null);

  const atLimit = images.length >= MAX_PORTFOLIO_IMAGES;

  const pickAndAdd = async () => {
    if (atLimit) {
      toast.error(t('profile.portfolioLimit', { count: MAX_PORTFOLIO_IMAGES }));
      return;
    }
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('profile.photoPermissionRequired'));
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
            { portfolio_images: [...images, uploaded.url] },
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
          {t('profile.portfolio')}
        </Text>
        <Text className="text-xs" style={{ color: colors.textMuted }}>
          {images.length}/{MAX_PORTFOLIO_IMAGES}
        </Text>
      </View>
      <Text className="text-xs mb-3" style={{ color: colors.textSecondary }}>
        {t('profile.portfolioHint')}
      </Text>

      <View className="flex-row flex-wrap" style={{ gap: 8 }}>
        {images.map((url) => (
          <View key={url} style={{ width: '31%', aspectRatio: 1 }}>
            <Image source={{ uri: url }} style={{ width: '100%', height: '100%', borderRadius: 12 }} contentFit="cover" />
            <Pressable
              onPress={() => removeImage(url)}
              disabled={removing === url}
              hitSlop={6}
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
  const { t } = useAppLanguage();
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
        <Loader message={t('profile.loadingWorkProfile')} />
      </Card>
    );
  }

  return (
    <>
      <Card className="mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold" style={{ color: colors.text }}>
            {t('profile.workProfile')}
          </Text>
          <Badge
            label={bridgeProfile?.is_approved ? t('profile.verified') : t('profile.pendingVerification')}
            backgroundColor={bridgeProfile?.is_approved ? '#dcfce7' : '#fef3c7'}
            color={bridgeProfile?.is_approved ? '#16a34a' : '#d97706'}
          />
        </View>

        <Controller
          control={form.control}
          name="experienceYears"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.experienceYears')} keyboardType="number-pad" value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="bridgeType"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.bridgeType')} placeholder={t('profile.bridgeTypePlaceholder')} value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="assignedArea"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.assignedArea')} placeholder={t('profile.assignedAreaPlaceholder')} value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="vehicleType"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.vehicleType')} placeholder={t('profile.vehicleTypePlaceholder')} value={value} onChangeText={onChange} />
          )}
        />
        <Controller
          control={form.control}
          name="workingShift"
          render={({ field: { onChange, value } }) => (
            <Input label={t('profile.workingShift')} placeholder={t('profile.workingShiftPlaceholder')} value={value} onChangeText={onChange} />
          )}
        />

        <Button
          title={t('profile.saveChanges')}
          onPress={() => void form.handleSubmit(onSave)()}
          loading={updateMutation.isPending}
          fullWidth
        />
      </Card>

      <Card className="mb-4 flex-row items-start">
        <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} style={{ marginTop: 1 }} />
        <Text className="text-xs ml-2 flex-1" style={{ color: colors.textSecondary }}>
          {t('profile.employeeManagedFieldsNote')}
        </Text>
      </Card>

      <KycStatusCard role="employee" />

      <EarningsLinkTile />
    </>
  );
}

export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const uploadPhotoMutation = useUploadProfilePhotoMutation();

  const pickAndUploadPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error(t('profile.photoPermissionRequired'));
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
        onSuccess: () => toast.success(t('profile.photoUpdated')),
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
    (roleLabel
      ? t('profile.roleAccount', { role: `${roleLabel.charAt(0).toUpperCase()}${roleLabel.slice(1)}` })
      : t('profile.yourAccount'));
  const hasRealName = Boolean(profile?.FullName?.trim() || user?.full_name?.trim());

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title={t('profile.title')} subtitle={t('profile.subtitle')} />
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
                  color={colors.onPrimary}
                />
              </View>
            </View>
          </Pressable>

          <Text className="text-2xl font-bold mt-4 text-center" style={{ color: colors.text }}>
            {displayName}
          </Text>
          {!hasRealName ? (
            <Text className="text-xs mt-1" style={{ color: colors.textMuted }}>
              {t('profile.addYourNameBelow')}
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
                {profile?.Email ?? user?.email ?? t('profile.noEmailSet')}
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

        {/* Email/mobile/password change and personal-details editing moved
            to a dedicated Account Settings screen - keeps this screen
            focused on identity + role-specific work fields + earnings for
            Tailor/Bridge, instead of one long scroll mixing identity, work
            fields, and account-security settings together. */}
        <Pressable
          onPress={() => router.push('/(drawer)/account-settings' as never)}
          pressScale={0.98}
          className="flex-row items-center mb-8 rounded-3xl p-4 border"
          style={{ backgroundColor: colors.card, borderColor: colors.border }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="settings-outline" size={18} color={colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold" style={{ color: colors.text }}>
              {t('profile.accountAndSecurity')}
            </Text>
            <Text className="text-xs mt-0.5" style={{ color: colors.textMuted }}>
              Email, mobile, password & personal details
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </ScreenContent>
    </View>
  );
}
