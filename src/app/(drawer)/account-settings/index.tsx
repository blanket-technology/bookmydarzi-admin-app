import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Card, Header, Input, PasswordInput, Pressable, ScreenContent } from '@/components/ui';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import { ChangeEmailSheet } from '@/features/settings/components/ChangeEmailSheet';
import { ChangeMobileSheet } from '@/features/settings/components/ChangeMobileSheet';
import {
  useChangePasswordMutation,
  useProfile,
  useUpdateProfileMutation,
} from '@/features/settings/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { newPasswordRule } from '@/features/auth/schemas/authSchemas';
import { getMutationError } from '@/utils/errors';

const profileSchema = z.object({
  firstName: z.string().trim().min(2, 'Enter at least 2 characters'),
  lastName: z.string().trim().min(2, 'Enter at least 2 characters'),
});

const passwordSchema = z
  .object({
    oldPassword: z.string().min(6, 'Enter your current password'),
    newPassword: newPasswordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

// Same tappable icon-left / value+chevron-right settings row Profile used
// to render inline - moved here verbatim.
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
  const { t } = useAppLanguage();
  return (
    <Pressable onPress={onPress} pressScale={0.98} className="flex-row items-center py-3.5">
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
            {value || t('profile.notSet')}
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

// Split out of profile.tsx's main screen component - Email/Mobile/Password
// and the plain name-edit form, so the Profile screen itself can stay
// focused on identity + role-specific work fields + earnings for Tailor/
// Bridge users, instead of a single long scroll mixing identity, work
// fields, and account-security settings together. Used by every role
// (admin/superadmin too), not just Tailor/Bridge.
export default function AccountSettingsScreen() {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const updateMutation = useUpdateProfileMutation();
  const passwordMutation = useChangePasswordMutation();
  const logoutMutation = useLogoutMutation();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [emailSheetVisible, setEmailSheetVisible] = useState(false);
  const [mobileSheetVisible, setMobileSheetVisible] = useState(false);

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
        onSuccess: () => toast.success(t('profile.profileUpdated')),
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  const onChangePassword = (data: PasswordForm) => {
    passwordMutation.mutate(
      { old_password: data.oldPassword, new_password: data.newPassword },
      {
        onSuccess: () => {
          toast.success(t('profile.passwordChanged'));
          passwordForm.reset();
          setShowPasswordForm(false);
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <Header title="Account Settings" subtitle="Security, contact details & personal info" />
      <ScreenContent>
        <Card className="mb-4">
          <Text className="text-lg font-bold mb-1" style={{ color: colors.text }}>
            {t('profile.accountAndSecurity')}
          </Text>
          <View className="divide-y" style={{ borderColor: colors.border }}>
            <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
              <SettingsRow
                icon="mail-outline"
                label={t('profile.emailAddress')}
                value={profile?.Email ?? user?.email}
                verified={profile?.IsEmailVerified}
                onPress={() => setEmailSheetVisible(true)}
              />
            </View>
            <View style={{ borderBottomWidth: 1, borderColor: colors.border }}>
              <SettingsRow
                icon="call-outline"
                label={t('profile.mobileNumber')}
                value={profile?.Mobile ?? user?.mobile}
                verified={profile?.IsMobileVerified}
                onPress={() => setMobileSheetVisible(true)}
              />
            </View>
            <SettingsRow
              icon="lock-closed-outline"
              label={t('profile.password')}
              value="••••••••"
              onPress={() => setShowPasswordForm((prev) => !prev)}
            />
          </View>

          {showPasswordForm ? (
            <View className="mt-4 pt-4 border-t" style={{ borderColor: colors.border }}>
              <Controller
                control={passwordForm.control}
                name="oldPassword"
                render={({ field: { onChange, value }, fieldState }) => (
                  <PasswordInput label={t('profile.currentPassword')} value={value} onChangeText={onChange} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="newPassword"
                render={({ field: { onChange, value }, fieldState }) => (
                  <PasswordInput label={t('profile.newPassword')} value={value} onChangeText={onChange} error={fieldState.error?.message} />
                )}
              />
              <Controller
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field: { onChange, value }, fieldState }) => (
                  <PasswordInput label={t('profile.confirmPassword')} value={value} onChangeText={onChange} error={fieldState.error?.message} />
                )}
              />
              <Button
                title={t('profile.updatePassword')}
                onPress={passwordForm.handleSubmit(onChangePassword)}
                loading={passwordMutation.isPending}
                fullWidth
              />
            </View>
          ) : null}
        </Card>

        <Card className="mb-4">
          <Text className="text-lg font-bold mb-4" style={{ color: colors.text }}>
            {t('profile.personalDetails')}
          </Text>
          <Controller
            control={profileForm.control}
            name="firstName"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input label={t('profile.firstName')} value={value} onChangeText={onChange} error={fieldState.error?.message} />
            )}
          />
          <Controller
            control={profileForm.control}
            name="lastName"
            render={({ field: { onChange, value }, fieldState }) => (
              <Input label={t('profile.lastName')} value={value} onChangeText={onChange} error={fieldState.error?.message} />
            )}
          />
          <Button
            title={t('profile.saveChanges')}
            onPress={profileForm.handleSubmit(onUpdateProfile)}
            loading={updateMutation.isPending}
            fullWidth
          />
        </Card>

        <Button
          title={t('profile.logout')}
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
