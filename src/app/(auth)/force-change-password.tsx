import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Text, View } from 'react-native';
import { z } from 'zod';
import { Button, Card, PasswordInput, Pressable, ScreenContent } from '@/components/ui';
import { newPasswordRule } from '@/features/auth/schemas/authSchemas';
import { useLogoutMutation } from '@/features/auth/hooks/useAuthMutations';
import { useChangePasswordMutation } from '@/features/settings/hooks/useProfile';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { toast } from '@/store/toastStore';
import { getDefaultRouteForRole } from '@/constants/permissions';
import { getMutationError } from '@/utils/errors';

// Shown instead of the drawer shell when the account is still on an
// admin-assigned default password (Tailor@123/Bridge@123 - see
// StaffCreateRequest.is_default_password on the backend, and
// authStore.mustChangePassword / (auth)/_layout.tsx for the gate itself).
// Reuses the exact same change-password mutation/endpoint as the voluntary
// flow on the Profile screen, just without the option to skip it.
const schema = z
  .object({
    oldPassword: z.string().min(6, 'Enter your current (default) password'),
    newPassword: newPasswordRule,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.newPassword !== data.oldPassword, {
    message: 'New password must be different from your current password',
    path: ['newPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ForceChangePasswordScreen() {
  const { colors } = useTheme();
  const { user, selectedRole } = useAuth();
  const setMustChangePassword = useAuthStore((s) => s.setMustChangePassword);
  const mutation = useChangePasswordMutation();
  const logoutMutation = useLogoutMutation();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(
      { old_password: data.oldPassword, new_password: data.newPassword },
      {
        onSuccess: () => {
          toast.success('Password updated. Welcome to BookMyDarzi!');
          setMustChangePassword(false);
          router.replace(getDefaultRouteForRole(user?.role, selectedRole) as never);
        },
        onError: (error) => toast.error(getMutationError(error)),
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScreenContent>
        <View style={{ alignItems: 'center', marginTop: 40, marginBottom: 24 }}>
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: 32,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
              backgroundColor: colors.primaryLight,
            }}
          >
            <Ionicons name="shield-checkmark-outline" size={30} color={colors.primary} />
          </View>
          <Text style={{ fontSize: 20, fontWeight: '700', textAlign: 'center', color: colors.text }}>
            Set a new password
          </Text>
          <Text style={{ fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 24, color: colors.textMuted }}>
            Your account was created with a default password. For your security, set a new
            password before continuing.
          </Text>
        </View>

        <Card>
          <Controller
            control={form.control}
            name="oldPassword"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="Current (default) Password"
                value={value}
                onChangeText={onChange}
                error={form.formState.errors.oldPassword?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="New Password"
                value={value}
                onChangeText={onChange}
                error={form.formState.errors.newPassword?.message}
              />
            )}
          />
          <Controller
            control={form.control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="Confirm New Password"
                value={value}
                onChangeText={onChange}
                error={form.formState.errors.confirmPassword?.message}
              />
            )}
          />
          <Button
            title="Update Password"
            onPress={() => void form.handleSubmit(onSubmit)()}
            loading={mutation.isPending}
            fullWidth
          />
        </Card>

        <Pressable
          style={{ alignItems: 'center', marginTop: 20, paddingVertical: 8 }}
          onPress={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textMuted }}>
            Not you? Sign out
          </Text>
        </Pressable>
      </ScreenContent>
    </View>
  );
}
