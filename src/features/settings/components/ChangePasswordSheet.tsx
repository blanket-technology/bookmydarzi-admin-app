import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { BottomSheet, Button, PasswordInput } from '@/components/ui';
import { newPasswordRule } from '@/features/auth/schemas/authSchemas';
import { useChangePasswordMutation } from '@/features/settings/hooks/useProfile';
import { useAppLanguage } from '@/hooks/useAppLanguage';
import { useTheme } from '@/hooks/useTheme';
import { toast } from '@/store/toastStore';
import { getMutationError } from '@/utils/errors';

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

type PasswordForm = z.infer<typeof passwordSchema>;

interface ChangePasswordSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Mirrors ChangeMobileSheet/ChangeEmailSheet's BottomSheet pattern - this
// used to expand inline on the Account Settings page itself (the only one
// of the three account-security options that did), which visually broke
// the page layout and was inconsistent with Email/Mobile both opening in a
// proper sheet.
export const ChangePasswordSheet = ({ visible, onClose }: ChangePasswordSheetProps) => {
  const { colors } = useTheme();
  const { t } = useAppLanguage();
  const passwordMutation = useChangePasswordMutation();

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Sheet stays mounted (BottomSheet owns the visible/hidden animation), so
  // the form must reset itself on every close - otherwise the next open
  // shows stale values (or a stale error) from the previous attempt.
  useEffect(() => {
    if (!visible) form.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleClose = () => {
    onClose();
    form.reset();
  };

  const onSubmit = (data: PasswordForm) => {
    passwordMutation.mutate(
      { old_password: data.oldPassword, new_password: data.newPassword },
      {
        onSuccess: () => {
          toast.success(t('profile.passwordChanged'));
          handleClose();
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      title={t('profile.password')}
      footer={
        <Button
          title={t('profile.updatePassword')}
          onPress={() => void form.handleSubmit(onSubmit)()}
          loading={passwordMutation.isPending}
          fullWidth
        />
      }
    >
      <View className="pt-1">
        <View className="items-center mb-5">
          <View
            className="w-14 h-14 rounded-full items-center justify-center mb-3"
            style={{ backgroundColor: colors.primaryLight }}
          >
            <Ionicons name="lock-closed-outline" size={26} color={colors.primary} />
          </View>
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
            Enter your current password, then choose a new one.
          </Text>
        </View>

        <Controller
          control={form.control}
          name="oldPassword"
          render={({ field: { onChange, value }, fieldState }) => (
            <PasswordInput
              label={t('profile.currentPassword')}
              value={value}
              onChangeText={onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="newPassword"
          render={({ field: { onChange, value }, fieldState }) => (
            <PasswordInput
              label={t('profile.newPassword')}
              value={value}
              onChangeText={onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field: { onChange, value }, fieldState }) => (
            <PasswordInput
              label={t('profile.confirmPassword')}
              value={value}
              onChangeText={onChange}
              error={fieldState.error?.message}
            />
          )}
        />
      </View>
    </BottomSheet>
  );
};
